[Diagnostics.CodeAnalysis.SuppressMessageAttribute("PSAvoidUsingPlainTextForPassword", "Passphrase", Justification = "Passphrase parameter is SecureString; environment fallback is explicit for non-interactive automation.")]
[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,

    [Parameter()]
    [string]$OneDrivePath = $env:OneDrive,

    [Parameter()]
    [string]$BackupSubdirectory = "DiggAI\diggai-anamnese\repo-backups",

    [Parameter()]
    [System.Security.SecureString]$Passphrase,

    [Parameter()]
    [switch]$IncludeTrackedSnapshot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Test-CommandExists {
    param([Parameter(Mandatory = $true)][string]$Name)
    return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Resolve-RequiredPath {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (-not (Test-Path -Path $Path)) {
        throw "$Label not found: $Path"
    }

    return (Resolve-Path -Path $Path).Path
}

function Get-EncryptionPassphrase {
    param([System.Security.SecureString]$Candidate)

    if ($null -ne $Candidate) {
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Candidate)
        try {
            $plainCandidate = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }

        if (-not [string]::IsNullOrWhiteSpace($plainCandidate)) {
            return $plainCandidate
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($env:DIGGAI_BACKUP_PASSPHRASE)) {
        return $env:DIGGAI_BACKUP_PASSPHRASE
    }

    throw "Missing passphrase. Provide -Passphrase or set DIGGAI_BACKUP_PASSPHRASE."
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)][string]$Repository,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$NoOutput
    )

    $escapedArguments = $Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_ -replace '"', '\\"') + '"'
        }
        else {
            $_
        }
    }

    $allArguments = @('-C', $Repository) + $escapedArguments

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'git'
    $startInfo.Arguments = ($allArguments -join ' ')
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $null = $process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($process.ExitCode -ne 0) {
        $failureText = ($stdout + "`n" + $stderr).Trim()
        throw "git $($Arguments -join ' ') failed: $failureText"
    }

    if ($NoOutput) {
        return
    }

    return (($stdout + "`n" + $stderr).Trim())
}

function New-RandomBytes {
    param([Parameter(Mandatory = $true)][int]$Length)

    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }

    return $bytes
}

function Protect-BytesAesCbcHmac {
    param(
        [Parameter(Mandatory = $true)][byte[]]$PlainBytes,
        [Parameter(Mandatory = $true)][string]$Passphrase
    )

    $salt = New-RandomBytes -Length 16
    $iv = New-RandomBytes -Length 16

    $kdf = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Passphrase, $salt, 200000)
    try {
        $keyMaterial = $kdf.GetBytes(64)
    }
    finally {
        $kdf.Dispose()
    }

    $aesKey = New-Object byte[] 32
    $hmacKey = New-Object byte[] 32
    [Array]::Copy($keyMaterial, 0, $aesKey, 0, 32)
    [Array]::Copy($keyMaterial, 32, $hmacKey, 0, 32)

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.Key = $aesKey
    $aes.IV = $iv

    $encryptor = $aes.CreateEncryptor()
    try {
        $cipherBytes = $encryptor.TransformFinalBlock($PlainBytes, 0, $PlainBytes.Length)
    }
    finally {
        $encryptor.Dispose()
        $aes.Dispose()
    }

    $header = [System.Text.Encoding]::ASCII.GetBytes("DGBAK1")
    $payload = New-Object byte[] ($header.Length + $salt.Length + $iv.Length + $cipherBytes.Length)

    $offset = 0
    [Array]::Copy($header, 0, $payload, $offset, $header.Length)
    $offset += $header.Length
    [Array]::Copy($salt, 0, $payload, $offset, $salt.Length)
    $offset += $salt.Length
    [Array]::Copy($iv, 0, $payload, $offset, $iv.Length)
    $offset += $iv.Length
    [Array]::Copy($cipherBytes, 0, $payload, $offset, $cipherBytes.Length)

    $hmac = New-Object System.Security.Cryptography.HMACSHA256 -ArgumentList (,$hmacKey)
    try {
        $mac = $hmac.ComputeHash($payload)
    }
    finally {
        $hmac.Dispose()
    }

    $result = New-Object byte[] ($payload.Length + $mac.Length)
    [Array]::Copy($payload, 0, $result, 0, $payload.Length)
    [Array]::Copy($mac, 0, $result, $payload.Length, $mac.Length)

    return $result
}

if (-not (Test-CommandExists -Name "git")) {
    throw "git is required but not available in PATH."
}

$resolvedRepoPath = Resolve-RequiredPath -Path $RepoPath -Label "Repository path"

$gitRoot = Invoke-Git -Repository $resolvedRepoPath -Arguments @("rev-parse", "--show-toplevel")
$expectedRoot = [System.IO.Path]::GetFullPath($resolvedRepoPath).TrimEnd([char[]]@('\', '/'))
$actualRoot = [System.IO.Path]::GetFullPath($gitRoot).TrimEnd([char[]]@('\', '/'))
if (-not $actualRoot.Equals($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Repository path must be the git root. Expected '$expectedRoot' but git root is '$actualRoot'."
}

if ([string]::IsNullOrWhiteSpace($OneDrivePath)) {
    throw "OneDrive path is empty. Set -OneDrivePath or configure the OneDrive environment."
}

$resolvedOneDrivePath = Resolve-RequiredPath -Path $OneDrivePath -Label "OneDrive path"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$repoName = Split-Path -Path $resolvedRepoPath -Leaf
$backupDirectory = Join-Path -Path $resolvedOneDrivePath -ChildPath $BackupSubdirectory

if (-not (Test-Path -Path $backupDirectory)) {
    New-Item -Path $backupDirectory -ItemType Directory -Force | Out-Null
}

$passphraseValue = Get-EncryptionPassphrase -Candidate $Passphrase

$tempDirectory = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ("diggai-backup-" + [guid]::NewGuid().ToString("N"))
New-Item -Path $tempDirectory -ItemType Directory -Force | Out-Null

try {
    $bundleName = "$repoName-$timestamp.bundle"
    $bundlePath = Join-Path -Path $tempDirectory -ChildPath $bundleName

    Invoke-Git -Repository $resolvedRepoPath -Arguments @("bundle", "create", $bundlePath, "--all") -NoOutput

    $commitSha = Invoke-Git -Repository $resolvedRepoPath -Arguments @("rev-parse", "HEAD")
    $branchName = Invoke-Git -Repository $resolvedRepoPath -Arguments @("branch", "--show-current")
    $originUrl = Invoke-Git -Repository $resolvedRepoPath -Arguments @("remote", "get-url", "origin")

    $manifest = [ordered]@{
        formatVersion = 1
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        repository = [ordered]@{
            name = $repoName
            root = $resolvedRepoPath
            branch = $branchName
            head = $commitSha
            origin = $originUrl
        }
        artifacts = [ordered]@{
            bundle = $bundleName
            includesTrackedSnapshot = [bool]$IncludeTrackedSnapshot
        }
    }

    $manifestPath = Join-Path -Path $tempDirectory -ChildPath "backup-manifest.json"
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath -Encoding UTF8

    $snapshotPath = $null
    if ($IncludeTrackedSnapshot) {
        $snapshotName = "$repoName-$timestamp-tracked.zip"
        $snapshotPath = Join-Path -Path $tempDirectory -ChildPath $snapshotName
        Invoke-Git -Repository $resolvedRepoPath -Arguments @("archive", "--format=zip", "--output", $snapshotPath, "HEAD") -NoOutput
    }

    $plainArchiveName = "$repoName-$timestamp-plain.zip"
    $plainArchivePath = Join-Path -Path $tempDirectory -ChildPath $plainArchiveName

    $compressItems = @($bundlePath, $manifestPath)
    if ($snapshotPath) {
        $compressItems += $snapshotPath
    }

    Compress-Archive -Path $compressItems -DestinationPath $plainArchivePath -CompressionLevel Optimal -Force

    $plainArchiveBytes = [System.IO.File]::ReadAllBytes($plainArchivePath)
    $encryptedBytes = Protect-BytesAesCbcHmac -PlainBytes $plainArchiveBytes -Passphrase $passphraseValue

    $encryptedFileName = "$repoName-$timestamp.dgbak"
    $encryptedFilePath = Join-Path -Path $backupDirectory -ChildPath $encryptedFileName
    [System.IO.File]::WriteAllBytes($encryptedFilePath, $encryptedBytes)

    $hash = (Get-FileHash -Path $encryptedFilePath -Algorithm SHA256).Hash
    $result = [ordered]@{
        success = $true
        encryptedBackup = $encryptedFilePath
        sha256 = $hash
        commit = $commitSha
        branch = $branchName
        includesTrackedSnapshot = [bool]$IncludeTrackedSnapshot
    }

    Write-Output ($result | ConvertTo-Json -Depth 5)
}
finally {
    if (Test-Path -Path $tempDirectory) {
        Remove-Item -Path $tempDirectory -Recurse -Force
    }
}
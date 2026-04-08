[Diagnostics.CodeAnalysis.SuppressMessageAttribute("PSAvoidUsingPlainTextForPassword", "Passphrase", Justification = "Passphrase is securely provided as SecureString or via controlled environment fallback for automation.")]
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [Parameter()]
    [string]$OutputDirectory = (Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath "diggai-restore"),

    [Parameter()]
    [System.Security.SecureString]$Passphrase,

    [Parameter()]
    [switch]$Overwrite,

    [Parameter()]
    [string]$RestoreRepositoryPath,

    [Parameter()]
    [string]$Branch = "master"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
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

function New-DerivedKeys {
    param(
        [Parameter(Mandatory = $true)][System.Security.SecureString]$PassphraseValue,
        [Parameter(Mandatory = $true)][byte[]]$Salt
    )

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PassphraseValue)
    try {
        $plainPassphrase = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }

    $kdf = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($plainPassphrase, $Salt, 200000)
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

    return [pscustomobject]@{
        AesKey = $aesKey
        HmacKey = $hmacKey
    }
}

function Test-ByteArrayEqual {
    param(
        [Parameter(Mandatory = $true)][byte[]]$Left,
        [Parameter(Mandatory = $true)][byte[]]$Right
    )

    if ($Left.Length -ne $Right.Length) {
        return $false
    }

    $diff = 0
    for ($i = 0; $i -lt $Left.Length; $i++) {
        $diff = $diff -bor ($Left[$i] -bxor $Right[$i])
    }

    return ($diff -eq 0)
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)][string]$ArgumentsLine
    )

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "git"
    $startInfo.Arguments = $ArgumentsLine
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
        throw "git $ArgumentsLine failed: $failureText"
    }

    return (($stdout + "`n" + $stderr).Trim())
}

if (-not (Test-Path -Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

$resolvedBackupFile = (Resolve-Path -Path $BackupFile).Path
$passphraseValue = Get-EncryptionPassphrase -Candidate $Passphrase
$passphraseSecure = ConvertTo-SecureString -String $passphraseValue -AsPlainText -Force

if (-not (Test-Path -Path $OutputDirectory)) {
    New-Item -Path $OutputDirectory -ItemType Directory -Force | Out-Null
}

$resolvedOutputDirectory = (Resolve-Path -Path $OutputDirectory).Path

$backupBytes = [System.IO.File]::ReadAllBytes($resolvedBackupFile)
if ($backupBytes.Length -lt 70) {
    throw "Backup file is too small or invalid."
}

$headerLength = 6
$saltLength = 16
$ivLength = 16
$macLength = 32
$metadataLength = $headerLength + $saltLength + $ivLength

$headerBytes = New-Object byte[] $headerLength
[Array]::Copy($backupBytes, 0, $headerBytes, 0, $headerLength)
$header = [System.Text.Encoding]::ASCII.GetString($headerBytes)
if ($header -ne "DGBAK1") {
    throw "Unsupported backup format header: '$header'"
}

$payloadLength = $backupBytes.Length - $macLength
if ($payloadLength -le $metadataLength) {
    throw "Backup payload is invalid."
}

$payload = New-Object byte[] $payloadLength
[Array]::Copy($backupBytes, 0, $payload, 0, $payloadLength)

$expectedMac = New-Object byte[] $macLength
[Array]::Copy($backupBytes, $payloadLength, $expectedMac, 0, $macLength)

$salt = New-Object byte[] $saltLength
[Array]::Copy($backupBytes, $headerLength, $salt, 0, $saltLength)

$iv = New-Object byte[] $ivLength
[Array]::Copy($backupBytes, $headerLength + $saltLength, $iv, 0, $ivLength)

$cipherLength = $payloadLength - $metadataLength
$cipherBytes = New-Object byte[] $cipherLength
[Array]::Copy($backupBytes, $metadataLength, $cipherBytes, 0, $cipherLength)

$keys = New-DerivedKeys -PassphraseValue $passphraseSecure -Salt $salt

$hmac = New-Object System.Security.Cryptography.HMACSHA256 -ArgumentList (,$keys.HmacKey)
try {
    $actualMac = $hmac.ComputeHash($payload)
}
finally {
    $hmac.Dispose()
}

if (-not (Test-ByteArrayEqual -Left $expectedMac -Right $actualMac)) {
    throw "Backup authentication failed. Passphrase may be incorrect or file is corrupted."
}

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
$aes.Key = $keys.AesKey
$aes.IV = $iv

$decryptor = $aes.CreateDecryptor()
try {
    $plainBytes = $decryptor.TransformFinalBlock($cipherBytes, 0, $cipherBytes.Length)
}
finally {
    $decryptor.Dispose()
    $aes.Dispose()
}

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($resolvedBackupFile)
$restoreDirectory = Join-Path -Path $resolvedOutputDirectory -ChildPath $baseName

if (Test-Path -Path $restoreDirectory) {
    if (-not $Overwrite) {
        throw "Restore directory already exists: $restoreDirectory (use -Overwrite to replace)."
    }

    Remove-Item -Path $restoreDirectory -Recurse -Force
}

New-Item -Path $restoreDirectory -ItemType Directory -Force | Out-Null

$zipPath = Join-Path -Path $restoreDirectory -ChildPath "$baseName.zip"
[System.IO.File]::WriteAllBytes($zipPath, $plainBytes)

Expand-Archive -Path $zipPath -DestinationPath $restoreDirectory -Force

$bundleFile = Get-ChildItem -Path $restoreDirectory -Filter "*.bundle" -File | Select-Object -First 1
$manifestFile = Join-Path -Path $restoreDirectory -ChildPath "backup-manifest.json"

$restoredRepoPath = $null
if (-not [string]::IsNullOrWhiteSpace($RestoreRepositoryPath) -and $bundleFile) {
    if (Test-Path -Path $RestoreRepositoryPath) {
        if (-not $Overwrite) {
            throw "Restore repository path already exists: $RestoreRepositoryPath (use -Overwrite to replace)."
        }

        Remove-Item -Path $RestoreRepositoryPath -Recurse -Force
    }

    $quotedBundle = '"' + $bundleFile.FullName + '"'
    $quotedRestorePath = '"' + $RestoreRepositoryPath + '"'
    Invoke-Git -ArgumentsLine ("clone " + $quotedBundle + " " + $quotedRestorePath) | Out-Null
    Invoke-Git -ArgumentsLine ("-C " + $quotedRestorePath + " checkout " + $Branch) | Out-Null
    $restoredRepoPath = (Resolve-Path -Path $RestoreRepositoryPath).Path
}

$result = [ordered]@{
    success = $true
    backupFile = $resolvedBackupFile
    restoreDirectory = $restoreDirectory
    bundle = if ($bundleFile) { $bundleFile.FullName } else { $null }
    manifest = if (Test-Path -Path $manifestFile) { $manifestFile } else { $null }
    restoredRepository = $restoredRepoPath
}

Write-Output ($result | ConvertTo-Json -Depth 6)
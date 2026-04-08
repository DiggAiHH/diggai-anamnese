[Diagnostics.CodeAnalysis.SuppressMessageAttribute("PSAvoidUsingPlainTextForPassword", "BackupPassphrase", Justification = "Backup passphrase parameter is SecureString and passed through to encrypted backup export only.")]
[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,

    [Parameter()]
    [string]$Branch = "master",

    [Parameter()]
    [switch]$CommitAll,

    [Parameter()]
    [string]$CommitMessage = "chore: synchronize local workspace",

    [Parameter()]
    [switch]$SkipPush,

    [Parameter()]
    [switch]$SkipPull,

    [Parameter()]
    [switch]$EnsureCodespace,

    [Parameter()]
    [string]$Owner = "DiggAiHH",

    [Parameter()]
    [string]$Repository = "diggai-anamnese",

    [Parameter()]
    [string]$CodespaceDisplayName = "diggai-anamnese-master-sync",

    [Parameter()]
    [string]$CodespaceMachine = "basicLinux32gb",

    [Parameter()]
    [switch]$RunBackupExport,

    [Parameter()]
    [string]$OneDrivePath,

    [Parameter()]
    [System.Security.SecureString]$BackupPassphrase,

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
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -Path $Path)) {
        throw "Path not found: $Path"
    }

    return (Resolve-Path -Path $Path).Path
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryPath,
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

    $allArguments = @('-C', $RepositoryPath) + $escapedArguments

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

function Invoke-Gh {
    param(
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

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'gh'
    $startInfo.Arguments = ($escapedArguments -join ' ')
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
        throw "gh $($Arguments -join ' ') failed: $failureText"
    }

    if ($NoOutput) {
        return
    }

    return (($stdout + "`n" + $stderr).Trim())
}

function Assert-RepositoryBoundary {
    param([Parameter(Mandatory = $true)][string]$RepositoryPath)

    $gitRoot = Invoke-Git -RepositoryPath $RepositoryPath -Arguments @("rev-parse", "--show-toplevel")
    $expectedRoot = [System.IO.Path]::GetFullPath($RepositoryPath).TrimEnd([char[]]@('\', '/'))
    $actualRoot = [System.IO.Path]::GetFullPath($gitRoot).TrimEnd([char[]]@('\', '/'))
    if (-not $actualRoot.Equals($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Repository path must be the git root. Expected '$expectedRoot' but got '$actualRoot'."
    }

    $userHome = [Environment]::GetFolderPath("UserProfile")
    $userHomeRoot = [System.IO.Path]::GetFullPath($userHome).TrimEnd([char[]]@('\', '/'))
    if ($actualRoot.Equals($userHomeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe repository root detected at user home directory: $actualRoot"
    }

    return $actualRoot
}

function Get-DivergenceCounts {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryPath,
        [Parameter(Mandatory = $true)][string]$TargetBranch
    )

    $counts = Invoke-Git -RepositoryPath $RepositoryPath -Arguments @("rev-list", "--left-right", "--count", "origin/$TargetBranch...$TargetBranch")
    $parts = $counts -split "\s+"

    if ($parts.Count -lt 2) {
        throw "Unexpected divergence output: $counts"
    }

    return [ordered]@{
        behind = [int]$parts[0]
        ahead = [int]$parts[1]
    }
}

if (-not (Test-CommandExists -Name "git")) {
    throw "git is required but not found in PATH."
}

$resolvedRepoPath = Resolve-RequiredPath -Path $RepoPath
$verifiedRoot = Assert-RepositoryBoundary -RepositoryPath $resolvedRepoPath

Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("fetch", "origin") -NoOutput
Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("checkout", $Branch) -NoOutput

if ($CommitAll) {
    $statusOutput = Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($statusOutput)) {
        Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("add", "-A") -NoOutput
        Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("commit", "-m", $CommitMessage) -NoOutput
    }
}

$postCommitStatus = Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("status", "--porcelain")
if (-not $SkipPull) {
    if (-not [string]::IsNullOrWhiteSpace($postCommitStatus)) {
        throw "Working tree has uncommitted changes. Commit/stash changes or run with -SkipPull."
    }

    Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("pull", "--rebase", "origin", $Branch) -NoOutput
}

if (-not $SkipPush) {
    Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("push", "origin", $Branch) -NoOutput
}

$divergence = Get-DivergenceCounts -RepositoryPath $resolvedRepoPath -TargetBranch $Branch

$codespaceSummary = $null
if ($EnsureCodespace) {
    if (-not (Test-CommandExists -Name "gh")) {
        throw "GitHub CLI (gh) is required for codespace operations."
    }

    $repoFullName = "$Owner/$Repository"

    try {
        Invoke-Gh -Arguments @("auth", "status") -NoOutput

        $listJson = Invoke-Gh -Arguments @("codespace", "list", "--repo", $repoFullName, "--json", "name,displayName,state,repository,gitStatus,lastUsedAt")
        $existingCodespaces = @()
        if (-not [string]::IsNullOrWhiteSpace($listJson)) {
            $existingCodespaces = $listJson | ConvertFrom-Json
        }

        $matchingCodespace = $existingCodespaces | Where-Object {
            ($_.displayName -eq $CodespaceDisplayName) -or ($_.gitStatus.ref -eq $Branch)
        } | Select-Object -First 1

        if (-not $matchingCodespace) {
            Invoke-Gh -Arguments @("codespace", "create", "--repo", $repoFullName, "--branch", $Branch, "--display-name", $CodespaceDisplayName, "--machine", $CodespaceMachine) -NoOutput

            $listJson = Invoke-Gh -Arguments @("codespace", "list", "--repo", $repoFullName, "--json", "name,displayName,state,repository,gitStatus,lastUsedAt")
            if (-not [string]::IsNullOrWhiteSpace($listJson)) {
                $existingCodespaces = $listJson | ConvertFrom-Json
                $matchingCodespace = $existingCodespaces | Where-Object {
                    ($_.displayName -eq $CodespaceDisplayName) -or ($_.gitStatus.ref -eq $Branch)
                } | Select-Object -First 1
            }
        }

        if ($matchingCodespace) {
            $codespaceSummary = [ordered]@{
                name = $matchingCodespace.name
                displayName = $matchingCodespace.displayName
                state = $matchingCodespace.state
                branch = $matchingCodespace.gitStatus.ref
                lastUsedAt = $matchingCodespace.lastUsedAt
            }
        }
        else {
            $codespaceSummary = [ordered]@{
                repository = $repoFullName
                branch = $Branch
                error = "No matching codespace found after create/list operations."
            }
        }
    }
    catch {
        $codespaceSummary = [ordered]@{
            repository = $repoFullName
            branch = $Branch
            error = $_.Exception.Message
        }
    }
}

$backupSummary = $null
if ($RunBackupExport) {
    $exportScriptPath = Join-Path -Path $PSScriptRoot -ChildPath "export-onedrive-backup.ps1"
    if (-not (Test-Path -Path $exportScriptPath)) {
        throw "Backup export script not found: $exportScriptPath"
    }

    $exportParams = @{
        RepoPath = $resolvedRepoPath
    }

    if (-not [string]::IsNullOrWhiteSpace($OneDrivePath)) {
        $exportParams.OneDrivePath = $OneDrivePath
    }

    if ($null -ne $BackupPassphrase) {
        $exportParams.Passphrase = $BackupPassphrase
    }

    if ($IncludeTrackedSnapshot) {
        $exportParams.IncludeTrackedSnapshot = $true
    }

    $rawBackupResult = & $exportScriptPath @exportParams
    if ($LASTEXITCODE -ne 0) {
        throw "Backup export script failed."
    }

    if (-not [string]::IsNullOrWhiteSpace($rawBackupResult)) {
        $backupSummary = $rawBackupResult | ConvertFrom-Json
    }
}

$headCommit = Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("rev-parse", "HEAD")
$originUrl = Invoke-Git -RepositoryPath $resolvedRepoPath -Arguments @("remote", "get-url", "origin")

$result = [ordered]@{
    success = $true
    repositoryRoot = $verifiedRoot
    branch = $Branch
    head = $headCommit
    origin = $originUrl
    divergence = $divergence
    codespace = $codespaceSummary
    backup = $backupSummary
}

Write-Output ($result | ConvertTo-Json -Depth 10)
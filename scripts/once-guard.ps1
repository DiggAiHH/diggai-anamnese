Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('precheck', 'claim', 'checkpoint', 'complete', 'status')]
    [string]$Command,

    [string]$Task,
    [string]$Agent = 'copilot',
    [Alias('Session')]
    [string]$SessionId = '',
    [int]$Batch = 0,
    [string]$Summary = '',
    [string]$Notes = '',
    [string]$NextStep = '',
    [string[]]$Done = @(),
    [string[]]$Next = @(),
    [string[]]$Artifacts = @(),
    [string[]]$Files = @(),
    [string]$TargetPath = ''
)

$RepoRoot = Split-Path -Parent $PSScriptRoot
$NodeScript = Join-Path $PSScriptRoot 'once-guard.mjs'

if (-not (Test-Path -Path $NodeScript)) {
    throw "Missing Node wrapper target: $NodeScript"
}

if ($Command -eq 'precheck' -and -not [string]::IsNullOrWhiteSpace($TargetPath)) {
    $ResolvedTargetPath = if ([System.IO.Path]::IsPathRooted($TargetPath)) {
        $TargetPath
    }
    else {
        Join-Path $RepoRoot $TargetPath
    }

    if (Test-Path -Path $ResolvedTargetPath) {
        Write-Output "[ARTIFACT_EXISTS] $Task | path=$TargetPath"
        exit 4
    }
}

$NodeArgs = @($NodeScript, $Command)

if (-not [string]::IsNullOrWhiteSpace($Task)) {
    $NodeArgs += @('--task', $Task)
}

if (-not [string]::IsNullOrWhiteSpace($Agent)) {
    $NodeArgs += @('--agent', $Agent)
}

if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
    $NodeArgs += @('--session', $SessionId)
}

if ($Batch -gt 0) {
    $NodeArgs += @('--batch', [string]$Batch)
}

if (-not [string]::IsNullOrWhiteSpace($Summary)) {
    $NodeArgs += @('--summary', $Summary)
}

if (-not [string]::IsNullOrWhiteSpace($Notes)) {
    $NodeArgs += @('--notes', $Notes)
}

$ResolvedDone = @($Done)
foreach ($Item in $ResolvedDone) {
    if (-not [string]::IsNullOrWhiteSpace($Item)) {
        $NodeArgs += @('--done', $Item)
    }
}

$ResolvedNext = @($Next)
if (-not [string]::IsNullOrWhiteSpace($NextStep)) {
    $ResolvedNext += $NextStep
}

foreach ($Item in $ResolvedNext) {
    if (-not [string]::IsNullOrWhiteSpace($Item)) {
        $NodeArgs += @('--next', $Item)
    }
}

$ResolvedArtifacts = @($Artifacts) + @($Files)
foreach ($Item in $ResolvedArtifacts) {
    if (-not [string]::IsNullOrWhiteSpace($Item)) {
        $NodeArgs += @('--artifacts', $Item)
    }
}

& node @NodeArgs
exit $LASTEXITCODE

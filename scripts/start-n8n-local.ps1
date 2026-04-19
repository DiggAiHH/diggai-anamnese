## start-n8n-local.ps1
# Loads .env.n8n_local from repo root and starts n8n via npx
try {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
} catch {
    $scriptRoot = Get-Location
}
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
$envPath = Join-Path $repoRoot '.env.n8n_local'

if (-not (Test-Path $envPath)) {
    Write-Host "Die Datei .env.n8n_local wurde nicht gefunden. Kopiere .env.n8n_local.template und bearbeite sie." -ForegroundColor Yellow
    Write-Host "Copy-Item .env.n8n_local.template .env.n8n_local" -ForegroundColor Cyan
    exit 1
}

Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $parts = $line -split '=', 2
    if ($parts.Length -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($value -match '^"(.*)"$') { $value = $matches[1] }
        $env:$name = $value
    }
}

Write-Host "Environment-Variablen geladen. Starte n8n (npx n8n start)..." -ForegroundColor Green

# Use npx so a global install is not required
npx --yes n8n start

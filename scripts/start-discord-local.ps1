## start-discord-local.ps1
# Loads .env.n8n_discord from repo root and starts the discord-bot (apps/discord-bot)
try {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
} catch {
    $scriptRoot = Get-Location
}
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
$envPath = Join-Path $repoRoot '.env.n8n_discord'

if (-not (Test-Path $envPath)) {
    Write-Host "Die Datei .env.n8n_discord wurde nicht gefunden. Kopiere .env.n8n_discord.template und bearbeite sie." -ForegroundColor Yellow
    Write-Host "Copy-Item .env.n8n_discord.template .env.n8n_discord" -ForegroundColor Cyan
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

$botDir = Join-Path $repoRoot 'apps\discord-bot'
Set-Location $botDir

if (-not (Test-Path (Join-Path $botDir 'node_modules'))) {
    Write-Host "node_modules nicht gefunden — installiere Abhängigkeiten..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starte Discord-Bot (npm start)..." -ForegroundColor Green
npm start

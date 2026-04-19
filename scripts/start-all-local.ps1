## start-all-local.ps1
# Öffnet zwei PowerShell-Fenster und startet n8n + Discord-Bot lokal (Windows)
try {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
} catch {
    $scriptRoot = Get-Location
}

$startN8n = Join-Path $scriptRoot 'start-n8n-local.ps1'
$startDiscord = Join-Path $scriptRoot 'start-discord-local.ps1'

if (-not (Test-Path $startN8n) -or -not (Test-Path $startDiscord)) {
    Write-Host "Startskripte fehlen. Stelle sicher, dass beide Skripte vorhanden sind." -ForegroundColor Red
    exit 1
}

Write-Host "Starte n8n in neuem PowerShell-Fenster..." -ForegroundColor Cyan
Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$startN8n`""

Start-Sleep -Milliseconds 500

Write-Host "Starte Discord-Bot in neuem PowerShell-Fenster..." -ForegroundColor Cyan
Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$startDiscord`""

Write-Host '--- Node & npm info ---'
try { Write-Host 'Node path:'; (Get-Command node).Source } catch { Write-Host 'node-not-found' }
try { Write-Host 'Node version:'; node -v } catch {}

# Get npm config values via cmd to avoid PowerShell npm.ps1 execution policy issues
$prefix = ''
$cache = ''
try { $prefix = (& cmd /c 'npm config get prefix') -replace '[\r\n]+$','' } catch {}
try { $cache = (& cmd /c 'npm config get cache') -replace '[\r\n]+$','' } catch {}

Write-Host "npm prefix: $prefix"
Write-Host "npm cache: $cache"

Write-Host '--- Drives free (GB) ---'
$drives = @('C','D')
foreach ($d in $drives) {
    try {
        if (Test-Path "$d`:") {
            $di = New-Object System.IO.DriveInfo("$d`:")
            Write-Host "$d`: $([math]::Round($di.AvailableFreeSpace/1GB,2)) GB free of $([math]::Round($di.TotalSize/1GB,2)) GB"
        } else {
            Write-Host "$d`: not present"
        }
    } catch { Write-Host "$d`: error - $_" }
}

Write-Host '--- Sizes ---'
if ($prefix -and (Test-Path $prefix)) {
    $s = (Get-ChildItem -Path $prefix -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host "prefix: $prefix -> $([math]::Round($s/1073741824,3)) GB"
} else { Write-Host "prefix: $prefix not found" }

if ($cache -and (Test-Path $cache)) {
    $s = (Get-ChildItem -Path $cache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host "cache: $cache -> $([math]::Round($s/1073741824,3)) GB"
} else { Write-Host "cache: $cache not found" }

Write-Host '--- Done ---'

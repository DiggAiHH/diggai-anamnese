@echo off
setlocal
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-login-csrf.log"

REM Schritt 1: GET fuer CSRF-Cookie
echo. >> "D:\Temp\fly-login-csrf.log"
echo === Schritt 1: CSRF-Token holen === >> "D:\Temp\fly-login-csrf.log"
curl -sS -i -c "D:\Temp\cookies-csrf.txt" -H "x-tenant-id: klaproth" https://diggai-api.fly.dev/api/auth/csrf-token >> "D:\Temp\fly-login-csrf.log" 2>&1
echo. >> "D:\Temp\fly-login-csrf.log"

REM Schritt 2: Token aus Cookie extrahieren via PowerShell
for /f "tokens=*" %%t in ('powershell -Command "(Get-Content 'D:\Temp\cookies-csrf.txt' | Select-String 'XSRF-TOKEN' | Select-Object -First 1) -replace '.*XSRF-TOKEN\t',''"') do set "CSRF_TOKEN=%%t"

echo. >> "D:\Temp\fly-login-csrf.log"
echo === Schritt 2: Login mit CSRF Header === >> "D:\Temp\fly-login-csrf.log"
echo CSRF-Token: %CSRF_TOKEN% >> "D:\Temp\fly-login-csrf.log"
echo. >> "D:\Temp\fly-login-csrf.log"

curl -sS -i -X POST -H "Content-Type: application/json" -H "x-tenant-id: klaproth" -H "X-CSRF-Token: %CSRF_TOKEN%" -b "D:\Temp\cookies-csrf.txt" -c "D:\Temp\cookies-csrf.txt" -d "{\"username\":\"admin\",\"password\":\"DiggAi2026!\"}" https://diggai-api.fly.dev/api/auth/arzt-login >> "D:\Temp\fly-login-csrf.log" 2>&1

echo. >> "D:\Temp\fly-login-csrf.log"
echo [End %date% %time%] >> "D:\Temp\fly-login-csrf.log"
endlocal

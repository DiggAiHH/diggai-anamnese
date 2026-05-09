@echo off
REM End-to-End API-Test: Patient-Session anlegen, Antwort abgeben, Queue-Status prüfen
setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-e2e.log"

echo. >> "D:\Temp\fly-e2e.log"
echo === 1. Health-Check === >> "D:\Temp\fly-e2e.log"
curl -sS https://diggai-api.fly.dev/api/health >> "D:\Temp\fly-e2e.log" 2>&1
echo. >> "D:\Temp\fly-e2e.log"

echo. >> "D:\Temp\fly-e2e.log"
echo === 2. CSRF-Token holen === >> "D:\Temp\fly-e2e.log"
curl -sS -i -c "D:\Temp\e2e-cookies.txt" -H "x-tenant-id: klaproth" https://diggai-api.fly.dev/api/csrf-token >> "D:\Temp\fly-e2e.log" 2>&1
echo. >> "D:\Temp\fly-e2e.log"

REM CSRF aus Cookie extrahieren
for /f "tokens=*" %%t in ('powershell -Command "(Get-Content 'D:\Temp\e2e-cookies.txt' | Select-String 'XSRF-TOKEN' | Select-Object -First 1) -replace '.*XSRF-TOKEN\t',''"') do set "CSRF=%%t"
echo CSRF-Token: %CSRF% >> "D:\Temp\fly-e2e.log"
echo. >> "D:\Temp\fly-e2e.log"

echo. >> "D:\Temp\fly-e2e.log"
echo === 3. Patient-Session anlegen === >> "D:\Temp\fly-e2e.log"
curl -sS -i -X POST -H "Content-Type: application/json" -H "x-tenant-id: klaproth" -H "X-CSRF-Token: %CSRF%" -b "D:\Temp\e2e-cookies.txt" -c "D:\Temp\e2e-cookies.txt" -d "{\"isNewPatient\":true,\"selectedService\":\"Termin / Anamnese\",\"gender\":\"male\",\"birthDate\":\"1980-06-15\"}" https://diggai-api.fly.dev/api/sessions >> "D:\Temp\fly-e2e.log" 2>&1
echo. >> "D:\Temp\fly-e2e.log"

echo [End %date% %time%] >> "D:\Temp\fly-e2e.log"
endlocal

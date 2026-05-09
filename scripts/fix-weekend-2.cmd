@echo off
REM Headless variant: läuft Deploy mit Logging in Datei, kein Pause.
REM Output landet in D:\Temp\fly-deploy.log

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

if not exist "D:\Temp" mkdir "D:\Temp"

REM Schritt 2 nur — Scale ist schon erledigt (ist 512 MB)
echo [Start %date% %time%] > "D:\Temp\fly-deploy.log"
flyctl deploy --remote-only -a diggai-api >> "D:\Temp\fly-deploy.log" 2>&1
echo. >> "D:\Temp\fly-deploy.log"
echo [Exit code: %errorlevel%] >> "D:\Temp\fly-deploy.log"
echo [End %date% %time%] >> "D:\Temp\fly-deploy.log"

REM Health-Check zum Abschluss
echo. >> "D:\Temp\fly-deploy.log"
echo --- Health nach Deploy --- >> "D:\Temp\fly-deploy.log"
curl -sS https://diggai-api.fly.dev/api/health >> "D:\Temp\fly-deploy.log" 2>&1

endlocal

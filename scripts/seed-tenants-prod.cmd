@echo off
REM Seedet Default-Tenant + Demo-Tenants in Production-DB via Fly-SSH.
REM Output → D:\Temp\fly-seed.log

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-seed.log"

echo. >> "D:\Temp\fly-seed.log"
echo === Schritt 1: Tenant-Seed (default) === >> "D:\Temp\fly-seed.log"
flyctl ssh console -a diggai-api -C "npx tsx prisma/seed-tenants.ts" >> "D:\Temp\fly-seed.log" 2>&1

echo. >> "D:\Temp\fly-seed.log"
echo === Schritt 2: Tenants pruefen === >> "D:\Temp\fly-seed.log"
curl -sS "https://diggai-api.fly.dev/api/atoms?tenant=default" >> "D:\Temp\fly-seed.log" 2>&1

echo. >> "D:\Temp\fly-seed.log"
echo [End %date% %time%] >> "D:\Temp\fly-seed.log"

endlocal

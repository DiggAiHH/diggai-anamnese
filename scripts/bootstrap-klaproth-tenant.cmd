@echo off
REM Seedet den Klaproth-Tenant (bsnr=999999999, subdomain=klaproth) in der Production-DB.
REM Damit endet der TENANT_NOT_FOUND-404-Fehler auf alle API-Calls von diggai.de root.
REM Output → D:\Temp\fly-bootstrap.log

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-bootstrap.log"

flyctl ssh console -a diggai-api -C "node scripts/bootstrap-prod-tenant.cjs" >> "D:\Temp\fly-bootstrap.log" 2>&1

echo. >> "D:\Temp\fly-bootstrap.log"
echo === Verifikation === >> "D:\Temp\fly-bootstrap.log"
curl -sS -H "x-tenant-id: klaproth" "https://diggai-api.fly.dev/api/atoms" >> "D:\Temp\fly-bootstrap.log" 2>&1
echo. >> "D:\Temp\fly-bootstrap.log"
echo [End %date% %time%] >> "D:\Temp\fly-bootstrap.log"

endlocal

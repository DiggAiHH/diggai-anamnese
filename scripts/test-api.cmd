@echo off
setlocal
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-test.log"

echo. >> "D:\Temp\fly-test.log"
echo === 1. Health === >> "D:\Temp\fly-test.log"
curl -sS https://diggai-api.fly.dev/api/health >> "D:\Temp\fly-test.log" 2>&1
echo. >> "D:\Temp\fly-test.log"

echo. >> "D:\Temp\fly-test.log"
echo === 2. Tenant via x-tenant-id Header (klaproth) === >> "D:\Temp\fly-test.log"
curl -sS -H "x-tenant-id: klaproth" https://diggai-api.fly.dev/api/atoms >> "D:\Temp\fly-test.log" 2>&1
echo. >> "D:\Temp\fly-test.log"

echo. >> "D:\Temp\fly-test.log"
echo === 3. Tenant via x-tenant-bsnr Header (999999999) === >> "D:\Temp\fly-test.log"
curl -sS -H "x-tenant-bsnr: 999999999" https://diggai-api.fly.dev/api/atoms >> "D:\Temp\fly-test.log" 2>&1
echo. >> "D:\Temp\fly-test.log"

echo. >> "D:\Temp\fly-test.log"
echo === 4. /api/tenants/by-bsnr/999999999 (public lookup) === >> "D:\Temp\fly-test.log"
curl -sS https://diggai-api.fly.dev/api/tenants/by-bsnr/999999999 >> "D:\Temp\fly-test.log" 2>&1
echo. >> "D:\Temp\fly-test.log"

echo. >> "D:\Temp\fly-test.log"
echo [End %date% %time%] >> "D:\Temp\fly-test.log"
endlocal

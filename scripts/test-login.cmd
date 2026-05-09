@echo off
setlocal
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-login.log"

echo. >> "D:\Temp\fly-login.log"
echo === ARZT Login Test === >> "D:\Temp\fly-login.log"
echo POST /api/auth/arzt-login mit username=admin, password=DiggAi2026! >> "D:\Temp\fly-login.log"
echo. >> "D:\Temp\fly-login.log"

curl -sS -i -X POST -H "Content-Type: application/json" -H "x-tenant-id: klaproth" -d "{\"username\":\"admin\",\"password\":\"DiggAi2026!\"}" -c "D:\Temp\cookies.txt" https://diggai-api.fly.dev/api/auth/arzt-login >> "D:\Temp\fly-login.log" 2>&1

echo. >> "D:\Temp\fly-login.log"
echo === Cookie-Datei === >> "D:\Temp\fly-login.log"
type "D:\Temp\cookies.txt" >> "D:\Temp\fly-login.log" 2>&1
echo. >> "D:\Temp\fly-login.log"

echo. >> "D:\Temp\fly-login.log"
echo === Test geschuetzter Endpoint mit Cookie === >> "D:\Temp\fly-login.log"
curl -sS -H "x-tenant-id: klaproth" -b "D:\Temp\cookies.txt" https://diggai-api.fly.dev/api/auth/me >> "D:\Temp\fly-login.log" 2>&1
echo. >> "D:\Temp\fly-login.log"

echo. >> "D:\Temp\fly-login.log"
echo [End %date% %time%] >> "D:\Temp\fly-login.log"
endlocal

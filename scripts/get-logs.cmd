@echo off
setlocal
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-logs.log"
flyctl logs -a diggai-api --no-tail >> "D:\Temp\fly-logs.log" 2>&1
echo. >> "D:\Temp\fly-logs.log"
echo [End %date% %time%] >> "D:\Temp\fly-logs.log"
endlocal

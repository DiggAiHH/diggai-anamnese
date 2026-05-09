@echo off
REM Simpler GDT-Endpoint-Smoke: nur prüfen dass Route existiert (401 expected, nicht 404).
setlocal
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-gdt-simple.log"

echo. >> "D:\Temp\fly-gdt-simple.log"
echo === GDT-Endpoint ohne Auth (erwartet 401) === >> "D:\Temp\fly-gdt-simple.log"
curl -sS -i -H "x-tenant-id: klaproth" "https://diggai-api.fly.dev/api/sessions/00000000-0000-0000-0000-000000000000/export/gdt" >> "D:\Temp\fly-gdt-simple.log" 2>&1
echo. >> "D:\Temp\fly-gdt-simple.log"

echo. >> "D:\Temp\fly-gdt-simple.log"
echo === Health: agents-Liste === >> "D:\Temp\fly-gdt-simple.log"
curl -sS https://diggai-api.fly.dev/api/health >> "D:\Temp\fly-gdt-simple.log" 2>&1

echo [End %date% %time%] >> "D:\Temp\fly-gdt-simple.log"
endlocal

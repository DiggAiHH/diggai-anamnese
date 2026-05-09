@echo off
REM End-to-End-Test: Patient-Session anlegen, ein paar Antworten, dann GDT-Export.
setlocal enabledelayedexpansion
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
if not exist "D:\Temp" mkdir "D:\Temp"
del "D:\Temp\fly-gdt.log" 2>nul
echo [Start %date% %time%] > "D:\Temp\fly-gdt.log"

REM Schritt 1: CSRF-Token holen
echo. >> "D:\Temp\fly-gdt.log"
echo === 1. CSRF-Token holen === >> "D:\Temp\fly-gdt.log"
curl -sS -i -c "D:\Temp\gdt-cookies.txt" -H "x-tenant-id: klaproth" https://diggai-api.fly.dev/api/csrf-token >> "D:\Temp\fly-gdt.log" 2>&1
echo. >> "D:\Temp\fly-gdt.log"

REM CSRF aus Cookie extrahieren via PowerShell
for /f "tokens=*" %%t in ('powershell -NoProfile -Command "(Get-Content 'D:\Temp\gdt-cookies.txt' | Select-String 'XSRF-TOKEN' | Select-Object -First 1).Line.Split([char]9)[-1]"') do set "CSRF=%%t"
echo CSRF=!CSRF! >> "D:\Temp\fly-gdt.log"

REM Schritt 2: Patient-Session anlegen
echo. >> "D:\Temp\fly-gdt.log"
echo === 2. Patient-Session anlegen === >> "D:\Temp\fly-gdt.log"
curl -sS -i -X POST ^
  -H "Content-Type: application/json" ^
  -H "x-tenant-id: klaproth" ^
  -H "X-CSRF-Token: !CSRF!" ^
  -b "D:\Temp\gdt-cookies.txt" ^
  -c "D:\Temp\gdt-cookies.txt" ^
  -d "{\"isNewPatient\":true,\"selectedService\":\"Termin / Anamnese\",\"gender\":\"male\",\"birthDate\":\"1980-06-15\"}" ^
  https://diggai-api.fly.dev/api/sessions > "D:\Temp\session-resp.txt" 2>&1
type "D:\Temp\session-resp.txt" >> "D:\Temp\fly-gdt.log"

REM Session-ID aus Response extrahieren
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-Content 'D:\Temp\session-resp.txt' -Raw | Select-String -Pattern '\"id\":\"([^\"]+)\"').Matches[0].Groups[1].Value"') do set "SESSION_ID=%%i"
echo. >> "D:\Temp\fly-gdt.log"
echo Session-ID=!SESSION_ID! >> "D:\Temp\fly-gdt.log"

REM Schritt 3: GDT-Export abrufen
echo. >> "D:\Temp\fly-gdt.log"
echo === 3. GDT-Export === >> "D:\Temp\fly-gdt.log"
curl -sS -i ^
  -H "x-tenant-id: klaproth" ^
  -b "D:\Temp\gdt-cookies.txt" ^
  "https://diggai-api.fly.dev/api/sessions/!SESSION_ID!/export/gdt?receiverId=TOMEDO" > "D:\Temp\gdt-output.txt" 2>&1
type "D:\Temp\gdt-output.txt" >> "D:\Temp\fly-gdt.log"

REM Schritt 4: Erste Zeilen der GDT-Datei extrahieren
echo. >> "D:\Temp\fly-gdt.log"
echo === 4. GDT-Datei-Inhalt (Body) === >> "D:\Temp\fly-gdt.log"
powershell -NoProfile -Command "$content = Get-Content 'D:\Temp\gdt-output.txt' -Raw; $idx = $content.IndexOf([char]13 + [char]10 + [char]13 + [char]10); if ($idx -gt 0) { $content.Substring($idx + 4) } else { $content }" >> "D:\Temp\fly-gdt.log" 2>&1

echo. >> "D:\Temp\fly-gdt.log"
echo [End %date% %time%] >> "D:\Temp\fly-gdt.log"
endlocal

@echo off
REM ============================================================
REM  DiggAi Spur-A — Verifikation mit Datei-Log
REM  Schreibt alle Ergebnisse in VERIFY_RESULT.txt
REM  damit Cowork-Session die Datei lesen kann.
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

set LOG=VERIFY_RESULT.txt
echo === DiggAi Spur-A Verifikation === > %LOG%
echo Datum: %DATE% %TIME% >> %LOG%
echo Verzeichnis: %CD% >> %LOG%
echo. >> %LOG%

echo [1/6] git status >> %LOG%
echo --- aktueller Branch --- >> %LOG%
git rev-parse --abbrev-ref HEAD >> %LOG% 2>&1
echo --- Anzahl geaenderter Files --- >> %LOG%
git status --porcelain | find /c /v "" >> %LOG%
echo --- letzte 5 Commits --- >> %LOG%
git log --oneline -5 >> %LOG% 2>&1
echo. >> %LOG%

echo [2/6] node + npm Versionen >> %LOG%
node --version >> %LOG% 2>&1
npm --version >> %LOG% 2>&1
echo. >> %LOG%

echo [3/6] node_modules vorhanden? >> %LOG%
if exist node_modules\.package-lock.json (
    echo JA — node_modules gefunden, skip npm install >> %LOG%
) else (
    echo NEIN — laufe npm install ^(kann 2-3 Minuten dauern^) >> %LOG%
    call npm install --no-audit --no-fund >> %LOG% 2>&1
)
echo. >> %LOG%

echo [4/6] TypeScript-Check >> %LOG%
call npm run type-check >> %LOG% 2>&1
echo Exit-Code TypeScript: %ERRORLEVEL% >> %LOG%
echo. >> %LOG%

echo [5/6] Vitest Single-Pass ^(unit + server, ohne e2e^) >> %LOG%
call npm run test:run -- --reporter=default --silent >> %LOG% 2>&1
echo Exit-Code Vitest: %ERRORLEVEL% >> %LOG%
echo. >> %LOG%

echo [6/6] Spezielle Regulatory-Tests >> %LOG%
call npx vitest run server/engine/__tests__/RoutingEngine.regulatory.test.ts --reporter=default >> %LOG% 2>&1
echo Exit-Code Regulatory-Test: %ERRORLEVEL% >> %LOG%
echo. >> %LOG%

echo === FERTIG === >> %LOG%
echo Log-Datei: %CD%\%LOG% >> %LOG%

REM Kopie auf den Desktop fuer leichten Zugriff
copy /Y %LOG% "%USERPROFILE%\Desktop\DiggAi_VERIFY_RESULT.txt" >nul

echo.
echo ============================================================
echo  Verifikation fertig. Log: %LOG%
echo  Kopie auf Desktop: DiggAi_VERIFY_RESULT.txt
echo ============================================================
echo.
echo Diese Eingabeaufforderung kann mit beliebiger Taste geschlossen werden.
pause >nul

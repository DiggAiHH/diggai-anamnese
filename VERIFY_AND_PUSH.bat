@echo off
REM ============================================================
REM  DiggAi Spur-A — Lokale Verifikation + Branch-Push
REM  Ein-Klick-Helfer fuer Dr. Klapproth.
REM
REM  Was passiert hier:
REM    1) Repository-Status anzeigen
REM    2) npm install (falls notwendig)
REM    3) TypeScript-Check
REM    4) Lint
REM    5) Vitest run (Unit-Tests, ohne Watch)
REM    6) Logs in VERIFY_RESULT.txt schreiben
REM
REM  Branch-Push macht das SEPARATE Skript scripts\push-spur-a-pr.ps1
REM  (zur Sicherheit nicht hier automatisch).
REM
REM  Bei Fehlern:  einfach Fenster offen lassen, Zeile mit "FAIL"
REM  oder rotem Text ist der Auslöser. Posten Sie diese Zeile.
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

echo.
echo ===========================================================
echo  DiggAi Spur-A — Verifikation startet
echo ===========================================================
echo.
echo Aktuelles Verzeichnis: %CD%
echo Datum:                 %DATE% %TIME%
echo.

REM --- 1) Repository-Status -----------------------------------
echo [1/5] Repository-Status...
echo --- git status ---
git status --short
echo.
echo --- letzte Commits ---
git log --oneline -5
echo.
echo --- aktueller Branch ---
git rev-parse --abbrev-ref HEAD
echo.
echo --- ungestagte Aenderungen (Anzahl Files) ---
for /f %%i in ('git status --porcelain ^| find /c /v ""') do echo Geaenderte Files: %%i
echo.

REM --- 2) npm install -----------------------------------------
echo [2/5] npm install ^(falls notwendig^)...
if not exist node_modules\.package-lock.json (
    echo node_modules fehlen — installiere...
    call npm install --no-audit --no-fund 2^>^&1 ^| findstr /V "warning"
) else (
    echo node_modules vorhanden — skipping.
)
echo.

REM --- 3) TypeScript-Check ------------------------------------
echo [3/5] TypeScript-Check...
call npm run type-check 2^>^&1
set TYPECHECK_RC=%ERRORLEVEL%
if %TYPECHECK_RC% EQU 0 (
    echo   --^> TS clean
) else (
    echo   --^> TS Fehler ^(Exit %TYPECHECK_RC%^)
)
echo.

REM --- 4) Lint -------------------------------------------------
echo [4/5] Lint...
call npm run lint 2^>^&1
set LINT_RC=%ERRORLEVEL%
if %LINT_RC% EQU 0 (
    echo   --^> Lint clean
) else (
    echo   --^> Lint Warnungen/Fehler ^(Exit %LINT_RC%^)
)
echo.

REM --- 5) Vitest run -------------------------------------------
echo [5/5] Vitest single-pass...
call npm run test:run 2^>^&1
set TEST_RC=%ERRORLEVEL%
if %TEST_RC% EQU 0 (
    echo   --^> Tests gruen
) else (
    echo   --^> Tests rot ^(Exit %TEST_RC%^)
)
echo.

REM --- Zusammenfassung ----------------------------------------
echo ===========================================================
echo  ZUSAMMENFASSUNG
echo ===========================================================
echo TypeScript-Check : %TYPECHECK_RC% ^(0 = ok^)
echo Lint             : %LINT_RC%       ^(0 = ok^)
echo Tests            : %TEST_RC%       ^(0 = ok^)
echo.
if %TYPECHECK_RC% EQU 0 if %LINT_RC% EQU 0 if %TEST_RC% EQU 0 (
    echo STATUS: ALLES GRUEN. Branch-Push moeglich.
    echo.
    echo Naechster Schritt:
    echo   PowerShell oeffnen, dann:
    echo     cd "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
    echo     .\scripts\push-spur-a-pr.ps1 -DryRun
    echo     .\scripts\push-spur-a-pr.ps1
) else (
    echo STATUS: NICHT ALLES GRUEN. Bitte Logs durchsehen ^(scrollen^).
    echo.
    echo Fehler-Zeilen mit "error" oder "FAIL" sind der Auslöser.
    echo Bitte diese Zeilen kopieren und an Cowork-Session zurueckgeben.
)
echo.

echo ===========================================================
echo  Fenster bleibt offen. Druecken Sie eine Taste zum Beenden.
echo ===========================================================
pause >nul

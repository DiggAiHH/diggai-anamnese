@echo off
REM ============================================================
REM  DiggAi — Quick Sanity Check (kein npm install, kein lint).
REM  Nur:  git status (kurz) + TypeScript-Check + Regulatory-Tests.
REM  Output landet in QUICK_CHECK_RESULT.txt.
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

set LOG=QUICK_CHECK_RESULT.txt

(echo === Quick Check %DATE% %TIME% ===) > %LOG%
(echo Repo: %CD%) >> %LOG%
(echo.) >> %LOG%

REM ---- 1) Git-Status ----
(echo [git] aktueller Branch:) >> %LOG%
git rev-parse --abbrev-ref HEAD >> %LOG% 2>&1
(echo [git] Anzahl geaenderter Files:) >> %LOG%
git status --porcelain | find /c /v "" >> %LOG%
(echo.) >> %LOG%

REM ---- 2) TypeScript-Check (nur App-Config, ist schneller) ----
(echo [TS] tsc --noEmit -p tsconfig.app.json) >> %LOG%
call npx tsc --noEmit -p tsconfig.app.json >> %LOG% 2>&1
(echo [TS] Exit: %ERRORLEVEL%) >> %LOG%
(echo.) >> %LOG%

REM ---- 3) Regulatorische Test-Suite (nur eine Datei, ist schnell) ----
(echo [vitest] RoutingEngine.regulatory.test.ts) >> %LOG%
call npx vitest run server/engine/__tests__/RoutingEngine.regulatory.test.ts --reporter=default --pool=forks --no-coverage >> %LOG% 2>&1
(echo [vitest] Exit: %ERRORLEVEL%) >> %LOG%
(echo.) >> %LOG%

(echo === FERTIG ===) >> %LOG%

REM Kopie auf Desktop fuer leichte Sichtbarkeit
copy /Y %LOG% "%USERPROFILE%\Desktop\DiggAi_QUICK_CHECK.txt" >nul

REM kurz pause damit der User das Fenster sieht
timeout /T 5 >nul
exit

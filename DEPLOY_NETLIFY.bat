@echo off
REM ============================================================
REM  DiggAi — Frontend zu Netlify deployen (Production)
REM
REM  Voraussetzung:
REM    - NETLIFY_AUTH_TOKEN in .env (bereits gesetzt)
REM    - NETLIFY_SITE_ID in .env (bereits gesetzt)
REM
REM  Live-URL: https://diggai-drklaproth.netlify.app
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

echo.
echo ============================================================
echo  DiggAi — Netlify Production Deploy
echo ============================================================
echo.

echo [1/3] TypeScript build ...
call npm run build
if errorlevel 1 (
    echo  FEHLER: Build fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo [2/3] Deploy zu Netlify Production ...
call npm run deploy:prod
if errorlevel 1 (
    echo  FEHLER: Deploy fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo [3/3] Live-URL pruefen:
echo   https://diggai.de
echo   https://diggai-anamnese.netlify.app
echo.
echo  Browser oeffnen? [j/N]:
set /p OPEN=""
if /i "%OPEN%"=="j" (
    start https://diggai.de
)

echo.
echo ============================================================
echo  DEPLOY FERTIG.
echo ============================================================
pause

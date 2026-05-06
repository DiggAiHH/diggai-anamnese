@echo off
REM ============================================================
REM  DiggAi — Cloud-DB Migration (Neon / Supabase / etc.)
REM
REM  Voraussetzung: DATABASE_URL in .env zeigt auf Cloud-Postgres.
REM
REM  Was passiert:
REM    1) Prisma Client generieren
REM    2) Schema gegen Cloud-DB pushen (migrate deploy)
REM    3) Optional: Demo-Daten seeden
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

echo.
echo ============================================================
echo  Cloud-DB Migration
echo ============================================================
echo.
echo  Pruefe DATABASE_URL in .env...
findstr /B /C:"DATABASE_URL=" .env
echo.

echo [1/3] Prisma Client generieren...
call npx prisma generate
if errorlevel 1 (
    echo  FEHLER: prisma generate fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo [2/3] Schema in Cloud-DB pushen ^(prisma db push, schneller als migrate^)...
call npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo  FEHLER: prisma db push fehlgeschlagen.
    echo  Pruefe DATABASE_URL und Internet.
    pause
    exit /b 1
)

echo.
echo [3/3] Demo-Daten seeden? ^(32 Patienten, 10 User^)
set /p SEED="    [j/N]: "
if /i "%SEED%"=="j" (
    call npm run db:seed:demo
)

echo.
echo ============================================================
echo  FERTIG. Cloud-DB ist bereit.
echo  Naechster Schritt: START_LOCAL_BACKEND.bat
echo ============================================================
echo.
pause

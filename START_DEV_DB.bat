@echo off
REM ============================================================
REM  DiggAi — Lokale Dev-DB starten (PostgreSQL + Redis)
REM
REM  Was passiert:
REM    1) Prueft ob Docker laeuft
REM    2) Startet docker-compose.dev-db.yml (postgres:16 + redis:7)
REM    3) Wartet bis Postgres ready ist
REM    4) Generiert Prisma Client
REM    5) Faehrt Prisma Migrations aus
REM    6) Optional: Demo-Daten seeden
REM
REM  Danach: START_LOCAL_BACKEND.bat starten.
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

echo.
echo ============================================================
echo  DiggAi — Dev-DB Bootstrap
echo ============================================================
echo.

REM ---- 1) Docker pruefen --------------------------------------
echo [1/6] Pruefe Docker...
docker version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  FEHLER: Docker ist nicht erreichbar.
    echo.
    echo  Mögliche Ursachen:
    echo    - Docker Desktop ist nicht installiert
    echo      Download: https://www.docker.com/products/docker-desktop/
    echo    - Docker Desktop laeuft nicht — bitte starten und 30s warten
    echo    - WSL2 Backend ist nicht aktiv
    echo.
    echo  Alternative ohne Docker:
    echo    - Cloud-Postgres bei Neon/Supabase anlegen ^(kostenlos^)
    echo    - DATABASE_URL in .env auf die Cloud-URL umstellen
    echo    - npx prisma migrate dev
    echo.
    pause
    exit /b 1
)
echo       Docker erreichbar.

REM ---- 2) Container starten -----------------------------------
echo.
echo [2/6] Starte Postgres + Redis Container...
docker compose -f docker-compose.dev-db.yml up -d
if errorlevel 1 (
    echo  FEHLER beim Container-Start. Abbruch.
    pause
    exit /b 1
)

REM ---- 3) Auf Postgres warten ---------------------------------
echo.
echo [3/6] Warte bis Postgres bereit ist...
set RETRY=0
:WAIT_PG
docker exec diggai-dev-postgres pg_isready -U postgres -d anamnese >nul 2>&1
if errorlevel 1 (
    set /a RETRY+=1
    if %RETRY% GEQ 30 (
        echo  TIMEOUT: Postgres antwortet nicht. Logs pruefen:
        echo  docker compose -f docker-compose.dev-db.yml logs postgres
        pause
        exit /b 1
    )
    timeout /t 1 /nobreak >nul
    goto WAIT_PG
)
echo       Postgres ready ^(nach %RETRY%s^).

REM ---- 4) Prisma generate -------------------------------------
echo.
echo [4/6] Prisma Client generieren...
call npx prisma generate
if errorlevel 1 (
    echo  FEHLER: prisma generate fehlgeschlagen.
    pause
    exit /b 1
)

REM ---- 5) Prisma migrate --------------------------------------
echo.
echo [5/6] Prisma Migrations ausfuehren...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo  WARNUNG: prisma migrate dev hatte ein Problem.
    echo  Falls dies eine bestehende DB ist: npx prisma migrate deploy
    echo  versuchen.
)

REM ---- 6) Demo-Daten ------------------------------------------
echo.
echo [6/6] Demo-Daten seeden? ^(32 Patienten, 10 User^)
set /p SEED="    [j/N]: "
if /i "%SEED%"=="j" (
    call npm run db:seed:demo
)

echo.
echo ============================================================
echo  FERTIG. Dev-DB laeuft auf:
echo    Postgres: localhost:5432  ^(user: postgres / pass: postgres^)
echo    Redis:    localhost:6379
echo.
echo  Naechster Schritt:
echo    START_LOCAL_BACKEND.bat
echo.
echo  Stoppen:
echo    docker compose -f docker-compose.dev-db.yml down
echo ============================================================
echo.
pause

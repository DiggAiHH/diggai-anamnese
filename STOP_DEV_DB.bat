@echo off
REM Stoppt die lokale Dev-DB (Container bleiben erhalten, Daten bleiben).
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
echo Stoppe Postgres + Redis ...
docker compose -f docker-compose.dev-db.yml down
echo.
echo Container gestoppt. Daten bleiben in Volumes erhalten.
echo Komplett-Reset ^(inkl. Daten^): docker compose -f docker-compose.dev-db.yml down -v
pause

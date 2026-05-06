@echo off
REM ============================================================
REM  DiggAi — Lokales Backend + Frontend starten
REM  Damit Christian Klapproth vom anderen PC testen kann.
REM ============================================================
REM
REM  WAS PASSIERT:
REM    - Backend (Express + Prisma) startet auf  http://localhost:3001
REM    - Frontend (Vite) startet auf             http://localhost:5173
REM    - Beide laufen parallel im selben Fenster.
REM
REM  Zugriff von ANDEREM Computer (Klapproth):
REM    1) Diesen PC Internet-erreichbar machen ueber
REM       cloudflared / ngrok / VS Code Tunnel.
REM       Anleitung: docs\TESTING_FOR_KLAPPROTH.md
REM
REM  WICHTIG:
REM    - PC muss an bleiben.
REM    - Beim Schliessen des Fensters wird das Backend gestoppt.
REM ============================================================

cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

echo.
echo ============================================================
echo  DiggAi LOKAL — Frontend + Backend werden gestartet
echo ============================================================
echo.
echo  Frontend wird verfuegbar auf: http://localhost:5173
echo  Backend  wird verfuegbar auf: http://localhost:3001
echo.
echo  Zum Beenden: Strg+C oder Fenster schliessen.
echo.
echo ============================================================
echo.

call npm run dev:all

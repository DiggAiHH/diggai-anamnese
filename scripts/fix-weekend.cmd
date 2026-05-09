@echo off
REM ─────────────────────────────────────────────────────────────────────────
REM  fix-weekend.cmd
REM
REM  EIN-KLICK-FIX FÜR DAS ANFRAGEN-PROBLEM (8. Mai 2026)
REM
REM  Was passiert:
REM    1. Memory-Limit auf Fly.io auf 512 MB heben (≈ 3.30 €/Monat statt 5+€).
REM    2. Code-Changes deployen (10 Background-Jobs abgeschaltet, V8-Heap-Decke).
REM    3. Health-Check, ob Backend gesund ist.
REM
REM  Vor dem Start nichts tun — keine Tabs zumachen, keine RAM-Sorgen.
REM  flyctl deploy läuft auf Fly.io-Servern (--remote-only), nicht auf
REM  deinem Rechner. Husky-Pre-Push-OOM ist deshalb irrelevant.
REM
REM  Wenn etwas schiefgeht: einfach nochmal starten. flyctl ist idempotent.
REM ─────────────────────────────────────────────────────────────────────────

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

echo.
echo ============================================================
echo   DiggAi — Wochenend-Fix
echo   1) Fly-Memory pruefen + ggfs. auf 512 MB heben
echo   2) Code-Diaet deployen (LOW_MEM_MODE)
echo   3) Health pruefen
echo ============================================================
echo.

REM ── Schritt 1: Memory auf 512 MB ──────────────────────────────────────────
echo [1/3] Fly-Memory anheben (idempotent — falls schon 512, passiert nichts)...
flyctl scale memory 512 -a diggai-api
if errorlevel 1 (
  echo.
  echo FEHLER: flyctl scale ist fehlgeschlagen. Pruefen:
  echo   - Bist du eingeloggt? "flyctl auth whoami"
  echo   - Steht eine Kreditkarte hinterlegt? https://fly.io/dashboard/personal/billing
  pause
  exit /b 1
)

echo.

REM ── Schritt 2: Code-Diaet deployen ────────────────────────────────────────
echo [2/3] Deploye Memory-Diaet (--remote-only, kein Husky/lokal RAM nötig)...
flyctl deploy --remote-only -a diggai-api
if errorlevel 1 (
  echo.
  echo FEHLER: Deploy ist fehlgeschlagen. Logs:
  echo   flyctl logs -a diggai-api
  pause
  exit /b 1
)

echo.

REM ── Schritt 3: Health-Check ───────────────────────────────────────────────
echo [3/3] Health-Check nach 30s Wartezeit...
timeout /t 30 /nobreak > nul

curl -sS https://diggai-api.fly.dev/api/health
echo.

echo.
echo ============================================================
echo   FERTIG. Pruefe oben: "memory":{"status":"ok"} = perfekt.
echo   "memory":{"status":"degraded"} = noch zu hoch, schicke mir
echo   den Output und ich speck weiter ab.
echo ============================================================
echo.
pause
endlocal

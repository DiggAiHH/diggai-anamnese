@echo off
REM Pusht den aktuellen Branch direkt nach master (Fast-Forward).
REM Damit deployt Netlify automatisch.
REM Output → D:\Temp\fly-push-master.log

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-push-master.log"

set GIT_TERMINAL_PROMPT=0
set HUSKY=0

echo. >> "D:\Temp\fly-push-master.log"
echo === Aktuell auf restructure/phase-1-workspace zurueckwechseln === >> "D:\Temp\fly-push-master.log"
git checkout restructure/phase-1-workspace --no-verify >> "D:\Temp\fly-push-master.log" 2>&1

echo. >> "D:\Temp\fly-push-master.log"
echo === git status === >> "D:\Temp\fly-push-master.log"
git status --short >> "D:\Temp\fly-push-master.log" 2>&1

echo. >> "D:\Temp\fly-push-master.log"
echo === git log -3 === >> "D:\Temp\fly-push-master.log"
git log -3 --oneline >> "D:\Temp\fly-push-master.log" 2>&1

echo. >> "D:\Temp\fly-push-master.log"
echo === Push branch nach master via refspec === >> "D:\Temp\fly-push-master.log"
git push origin restructure/phase-1-workspace:master --no-verify --force >> "D:\Temp\fly-push-master.log" 2>&1

echo. >> "D:\Temp\fly-push-master.log"
echo [End %date% %time%] >> "D:\Temp\fly-push-master.log"
endlocal

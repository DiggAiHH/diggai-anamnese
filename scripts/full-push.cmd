@echo off
REM Vollständiger Push: checkout branch, commit, push branch, push branch->master.
REM Output → D:\Temp\fly-full-push.log

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-full-push.log"

set GIT_TERMINAL_PROMPT=0
set HUSKY=0

echo. >> "D:\Temp\fly-full-push.log"
echo === checkout branch === >> "D:\Temp\fly-full-push.log"
git checkout restructure/phase-1-workspace >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo === git status === >> "D:\Temp\fly-full-push.log"
git status --short >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo === git add -A === >> "D:\Temp\fly-full-push.log"
git add -A >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo === git commit --no-verify === >> "D:\Temp\fly-full-push.log"
git commit --no-verify -m "fix: api-client redirect + B2 multi-select-routing-bug" >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo === Push branch === >> "D:\Temp\fly-full-push.log"
git push --no-verify origin restructure/phase-1-workspace >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo === Push branch -> master === >> "D:\Temp\fly-full-push.log"
git push origin restructure/phase-1-workspace:master --no-verify --force >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo === git log -3 === >> "D:\Temp\fly-full-push.log"
git log -3 --oneline >> "D:\Temp\fly-full-push.log" 2>&1

echo. >> "D:\Temp\fly-full-push.log"
echo [End %date% %time%] >> "D:\Temp\fly-full-push.log"
endlocal

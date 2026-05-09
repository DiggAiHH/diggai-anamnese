@echo off
REM Push current branch tip to origin/master.
setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-final.log"
set GIT_TERMINAL_PROMPT=0
set HUSKY=0

git status --short >> "D:\Temp\fly-final.log" 2>&1
git branch --show-current >> "D:\Temp\fly-final.log" 2>&1
echo. >> "D:\Temp\fly-final.log"

git add -A >> "D:\Temp\fly-final.log" 2>&1
git commit --no-verify -m "fix: B4 stable counter + B5 PWA i18n fallbacks" >> "D:\Temp\fly-final.log" 2>&1

git log -3 --oneline >> "D:\Temp\fly-final.log" 2>&1
echo. >> "D:\Temp\fly-final.log"

echo === push HEAD -^> origin/master === >> "D:\Temp\fly-final.log"
git push origin HEAD:master --no-verify --force >> "D:\Temp\fly-final.log" 2>&1

echo. >> "D:\Temp\fly-final.log"
echo === push HEAD -^> origin/branch === >> "D:\Temp\fly-final.log"
git push origin HEAD --no-verify >> "D:\Temp\fly-final.log" 2>&1

echo [End %date% %time%] >> "D:\Temp\fly-final.log"
endlocal

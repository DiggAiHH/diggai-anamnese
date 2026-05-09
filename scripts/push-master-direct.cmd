@echo off
setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-master-direct.log"
set GIT_TERMINAL_PROMPT=0
set HUSKY=0

git status --short >> "D:\Temp\fly-master-direct.log" 2>&1
git branch --show-current >> "D:\Temp\fly-master-direct.log" 2>&1
git log -3 --oneline >> "D:\Temp\fly-master-direct.log" 2>&1

echo. >> "D:\Temp\fly-master-direct.log"
echo === Push master === >> "D:\Temp\fly-master-direct.log"
git push origin master --no-verify --force >> "D:\Temp\fly-master-direct.log" 2>&1

echo [End %date% %time%] >> "D:\Temp\fly-master-direct.log"
endlocal

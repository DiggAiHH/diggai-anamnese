@echo off
setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-state.log"
git fetch origin master --no-tags >> "D:\Temp\fly-state.log" 2>&1
git branch --show-current >> "D:\Temp\fly-state.log" 2>&1
echo. >> "D:\Temp\fly-state.log"
echo === Local master log === >> "D:\Temp\fly-state.log"
git log master --oneline -5 >> "D:\Temp\fly-state.log" 2>&1
echo. >> "D:\Temp\fly-state.log"
echo === Origin master log === >> "D:\Temp\fly-state.log"
git log origin/master --oneline -5 >> "D:\Temp\fly-state.log" 2>&1
echo. >> "D:\Temp\fly-state.log"
echo === Diff origin/master vs local master === >> "D:\Temp\fly-state.log"
git diff origin/master master --name-only >> "D:\Temp\fly-state.log" 2>&1
echo. >> "D:\Temp\fly-state.log"
echo === index.html dns-prefetch === >> "D:\Temp\fly-state.log"
git show origin/master:index.html | findstr "api-takios diggai-api fly.dev" >> "D:\Temp\fly-state.log" 2>&1
echo [End %date% %time%] >> "D:\Temp\fly-state.log"
endlocal

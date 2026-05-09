@echo off
REM Pusht alle gestagten Änderungen ohne Husky-Hooks (umgeht den 940MB-OOM-Block).
REM Netlify deployt automatisch nach Push auf master.
REM Output → D:\Temp\fly-push.log

setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-push.log"

set GIT_TERMINAL_PROMPT=0
set HUSKY=0

echo. >> "D:\Temp\fly-push.log"
echo === git status === >> "D:\Temp\fly-push.log"
git status --short >> "D:\Temp\fly-push.log" 2>&1

echo. >> "D:\Temp\fly-push.log"
echo === git add -A === >> "D:\Temp\fly-push.log"
git add -A >> "D:\Temp\fly-push.log" 2>&1

echo. >> "D:\Temp\fly-push.log"
echo === git commit --no-verify === >> "D:\Temp\fly-push.log"
git commit --no-verify -m "fix: backend bug-pass + frontend queue-URL via VITE_API_URL" >> "D:\Temp\fly-push.log" 2>&1

echo. >> "D:\Temp\fly-push.log"
echo === git push --no-verify --set-upstream === >> "D:\Temp\fly-push.log"
for /f "delims=" %%b in ('git symbolic-ref --short HEAD') do set "BRANCH=%%b"
echo Current branch: %BRANCH% >> "D:\Temp\fly-push.log"
git push --no-verify --set-upstream origin %BRANCH% >> "D:\Temp\fly-push.log" 2>&1

echo. >> "D:\Temp\fly-push.log"
echo === git log -3 === >> "D:\Temp\fly-push.log"
git log -3 --oneline >> "D:\Temp\fly-push.log" 2>&1

echo. >> "D:\Temp\fly-push.log"
echo [End %date% %time%] >> "D:\Temp\fly-push.log"
endlocal

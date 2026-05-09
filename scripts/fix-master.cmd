@echo off
REM Master ist BEHIND restructure/phase-1-workspace bei den Frontend-Änderungen.
REM Lösung: restructure/phase-1-workspace überschreibt master vollständig (force-push).
REM Die jüngsten master-only Commits (cb9fa87, a87dcdf) müssen vorher als cherry-pick
REM auf den branch.
setlocal
cd /d "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-fixmaster.log"
set GIT_TERMINAL_PROMPT=0
set HUSKY=0

echo === checkout branch === >> "D:\Temp\fly-fixmaster.log"
git checkout restructure/phase-1-workspace >> "D:\Temp\fly-fixmaster.log" 2>&1

echo. >> "D:\Temp\fly-fixmaster.log"
echo === cherry-pick master commits a87dcdf cb9fa87 === >> "D:\Temp\fly-fixmaster.log"
git cherry-pick cb9fa87 a87dcdf -X theirs >> "D:\Temp\fly-fixmaster.log" 2>&1

echo. >> "D:\Temp\fly-fixmaster.log"
echo === git log -5 === >> "D:\Temp\fly-fixmaster.log"
git log -5 --oneline >> "D:\Temp\fly-fixmaster.log" 2>&1

echo. >> "D:\Temp\fly-fixmaster.log"
echo === Force-push branch -^> master === >> "D:\Temp\fly-fixmaster.log"
git push origin restructure/phase-1-workspace:master --no-verify --force >> "D:\Temp\fly-fixmaster.log" 2>&1

echo. >> "D:\Temp\fly-fixmaster.log"
echo === Verifikation: index.html dns-prefetch === >> "D:\Temp\fly-fixmaster.log"
findstr /C:"dns-prefetch" /C:"preconnect" index.html >> "D:\Temp\fly-fixmaster.log" 2>&1

echo [End %date% %time%] >> "D:\Temp\fly-fixmaster.log"
endlocal

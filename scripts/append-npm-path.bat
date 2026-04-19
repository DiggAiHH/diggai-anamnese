@echo off
rem Append D:\npm-global to the USER PATH if not present
setlocal enabledelayedexpansion
set CURPATH=%PATH%
echo Current PATH length: %CURPATH:~0,10%...
echo %CURPATH% | findstr /I /C:"D:\npm-global" >nul
if %errorlevel%==0 (
  echo PATH already contains D:\npm-global
) else (
  echo Appending D:\npm-global to PATH (user-level)
  setx PATH "%CURPATH%;D:\npm-global"
  echo setx completed
)
endlocal

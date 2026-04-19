@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%once-guard.mjs" %*
exit /b %ERRORLEVEL%
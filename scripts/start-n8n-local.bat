@echo off
REM Start n8n locally (Windows batch) from repository root
cd /d "%~dp0\.."
echo Starting n8n in %cd%
SETLOCAL
set N8N_BASIC_AUTH_ACTIVE=true
set N8N_BASIC_AUTH_USER=admin
set N8N_BASIC_AUTH_PASSWORD=admin
npx --yes n8n start
ENDLOCAL

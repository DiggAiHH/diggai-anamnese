@echo off
rem run-n8n-local.bat - start n8n using npx from repo root and log to n8n.log
pushd "%~dp0\.."
set "N8N_BASIC_AUTH_ACTIVE=true"
set "N8N_BASIC_AUTH_USER=admin"
set "N8N_BASIC_AUTH_PASSWORD=admin"
echo Starting n8n in %CD% - logging to n8n.log
npx --yes n8n start > "%~dp0\..\n8n.log" 2>&1
popd

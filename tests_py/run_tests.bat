@echo off
REM ============================================================
REM  run_tests.bat — Quick launcher for DiggAI Python E2E tests
REM  
REM  Usage:
REM    run_tests.bat                  — Run all tests (headed)
REM    run_tests.bat --headless       — Run headless (CI mode)
REM    run_tests.bat -k test_01       — Run only UI tests
REM    run_tests.bat -m encryption    — Run only encryption tests
REM    run_tests.bat --html=report.html — Generate HTML report
REM ============================================================

set PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers
set SCRIPT_DIR=%~dp0

call "%SCRIPT_DIR%venv\Scripts\activate.bat"
cd /d "%SCRIPT_DIR%"
python -m pytest %*

@echo off
echo Starting Realtime STT Web Application...
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

echo Starting API server with auto-reload...
start cmd /k "cd /d "%SCRIPT_DIR%" && python -m flask --app api_server run --debug --port 5000"

echo Waiting for API server to start...
timeout /t 3 /nobreak > nul

echo Starting frontend development server...
start cmd /k "cd /d "%SCRIPT_DIR%\website" && npm run dev"

echo.
echo Both servers are starting...
echo API Server: http://localhost:5000 (with auto-reload)
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul
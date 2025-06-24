@echo off
echo Starting Realtime STT Web Application...
echo.

echo Starting API server...
start cmd /k "cd /d c:\Users\brent\Documents\Blogging && python api_server.py"

echo Waiting for API server to start...
timeout /t 3 /nobreak > nul

echo Starting frontend development server...
start cmd /k "cd /d c:\Users\brent\Documents\Blogging\website && npm run dev"

echo.
echo Both servers are starting...
echo API Server: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul

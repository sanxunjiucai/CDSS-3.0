@echo off
echo Starting CDSS 3.0 Development Servers...
echo.

echo [1/3] Starting Backend (port 8000)...
start "CDSS Backend" /D "%~dp0backend" cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [2/3] Starting PC Frontend...
start "CDSS PC Frontend" /D "%~dp0frontend\pc" cmd /k "npm run dev"

echo [3/3] Starting Admin Frontend...
start "CDSS Admin Frontend" /D "%~dp0frontend\admin" cmd /k "npm run dev"

echo.
echo All servers started. Check the opened windows for port numbers.
echo   Backend:  http://localhost:8000
echo   PC:       http://localhost:3000/pc/
echo   Admin:    http://localhost:3002/admin/
echo.
pause

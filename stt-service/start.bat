@echo off
echo ============================================
echo  Speech-to-Text API - Starting Services
echo ============================================
echo.
echo Your local IP is: 192.168.1.101
echo.
echo Backend API:  http://192.168.1.101:8000
echo API Docs:     http://192.168.1.101:8000/docs
echo Frontend:     Open the Expo QR code in Expo Go app
echo.
echo Make sure your phone is on the same Wi-Fi network!
echo.

:: Start the FastAPI backend - bind to 0.0.0.0 so phones on network can reach it
start "Backend - Speech API" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Start the Expo frontend
start "Frontend - Expo" cmd /k "cd frontend && npm start"

echo Both services are starting...
echo Press any key to close this window.
pause > nul

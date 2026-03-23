@echo off
setlocal

cd /d c:\Reservation\React
call npm run build
if errorlevel 1 (
  pause >nul
  exit /b 1
)

cd /d c:\Reservation\API
npm start

pause >nul

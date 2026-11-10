@echo off
cd /d "%~dp0"
echo Starting StackSense at http://localhost:3000 ...
node server.js
echo.
echo StackSense stopped. Press any key to close this window.
pause >nul

@echo off
cd /d "%~dp0"
echo Launching Taskora Backend and Frontend...
start "Taskora Server" cmd /k run-server.bat
start "Taskora Vite" cmd /k run-frontend.bat
timeout /t 3 /nobreak >nul
start http://localhost:8000

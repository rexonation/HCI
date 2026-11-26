@echo off
set PATH=C:\php;C:\laragon\bin\php\php-8.3.36-Win32-vs16-x64;C:\laragon\bin\composer;%PATH%
cd /d "%~dp0"
echo Starting Taskora Laravel Server on http://localhost:8000 ...
php artisan serve
pause

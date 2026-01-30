@echo off
echo Starting RendMD Development Server...
echo.

:: Set Node.js path if not in PATH
set PATH=%PATH%;C:\Program Files\nodejs

:: Navigate to project directory
cd /d "%~dp0"

:: Start the dev server
npm run dev

pause

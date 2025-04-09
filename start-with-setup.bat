@echo off
REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Display welcome message
echo.
echo ======================================
echo    Walmart App - Setup and Launch
echo ======================================
echo.
echo This script will:
echo  1. Apply the Supabase schema
echo  2. Launch the application
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

REM Run the setup and start script
echo.
echo Starting setup process...
node setup-and-start.js

REM If there's an error, pause to show the message
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Setup encountered an error.
  pause
) 
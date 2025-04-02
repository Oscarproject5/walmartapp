@echo off
REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Check if .env.local exists
IF NOT EXIST ".env.local" (
    echo Error: .env.local file not found!
    echo Please create .env.local with your Supabase and OpenRouter credentials
    echo See README.md for instructions
    pause
    exit /b 1
)

REM Check if the required environment variables are set in .env.local
findstr "NEXT_PUBLIC_SUPABASE_URL" .env.local >nul
IF %ERRORLEVEL% NEQ 0 (
    echo Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local
    pause
    exit /b 1
)

findstr "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local >nul
IF %ERRORLEVEL% NEQ 0 (
    echo Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local
    pause
    exit /b 1
)

findstr "OPENROUTER_API_KEY" .env.local >nul
IF %ERRORLEVEL% NEQ 0 (
    echo Error: OPENROUTER_API_KEY not found in .env.local
    pause
    exit /b 1
)

REM Open the default browser to the app's URL
REM Note: The server may take a few seconds to start, so you might need to refresh
start http://localhost:3000

REM Start the Next.js development server
npm run dev 
@echo off
title Quiz Server
cd /d "%~dp0server"

if not exist "node_modules" (
    echo [Setup] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed.
        echo Possible causes:
        echo   - No internet connection
        echo   - Node.js not installed ^(run node --version to check^)
        echo.
        pause
        exit /b 1
    )
)

cls
echo.
echo ============================================================
echo              QUIZ SERVER — THE HOT SEAT
echo ============================================================
echo.
echo  After the server starts, look for this line:
echo.
echo      Server listening on http://192.168.x.x:4000
echo.
echo  That IP ^(the 192.168.x.x part^) is the address every
echo  other device uses to connect to this laptop.
echo.
echo  ---
echo  On THIS laptop you can also use:
echo      http://localhost:4000
echo  ---
echo.
echo  PRESS Ctrl+C TO STOP THE SERVER
echo ============================================================
echo.

npm run dev

echo.
echo ============================================================
echo   Server stopped.
echo   You may close this window.
echo ============================================================
echo.
pause

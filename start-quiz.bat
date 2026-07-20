@echo off
setlocal

REM Always work from this script's own folder, even when double-clicked elsewhere.
cd /d "%~dp0"

echo.
echo ================================================================
echo                     QUIZ SERVER LAUNCHER
echo ================================================================
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required but were not found.
  echo Install the current Node.js LTS release, then run this file again.
  goto :failed
)

if not exist "server\node_modules" (
  echo First-time setup: installing server dependencies...
  call npm.cmd --prefix server install
  if errorlevel 1 goto :failed
)

if not exist "client\node_modules" (
  echo First-time setup: installing client dependencies...
  call npm.cmd --prefix client install
  if errorlevel 1 goto :failed
)

if not exist "client\dist\index.html" (
  echo Preparing the quiz screens for the first run...
  call npm.cmd --prefix client run build
  if errorlevel 1 goto :failed
)

echo.
echo Starting the quiz server. The LAN address will appear in a large banner below.
echo Keep this window open while the quiz is running.
echo.

pushd server
call npm.cmd run dev
set "SERVER_EXIT_CODE=%ERRORLEVEL%"
popd

echo.
echo ***************************************************************
echo * THE SERVER STOPPED - TRY RUNNING THIS AGAIN.               *
echo ***************************************************************
pause
exit /b %SERVER_EXIT_CODE%

:failed
echo.
echo ***************************************************************
echo * THE QUIZ SERVER COULD NOT START - TRY RUNNING THIS AGAIN. *
echo ***************************************************************
pause
exit /b 1

@echo off
setlocal
set ROOT=%~dp0
title iNNfo Dev Environment

echo.
echo +----------------------------------------------------+
echo ^|       iNNfo — Dev Environment                ^|
echo +----------------------------------------------------+
echo.

REM ── Kill any previous dev windows (targeted, not all node.exe!) ──
echo   Cleaning up previous dev servers...
taskkill /fi "WINDOWTITLE eq innfo-editor*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq iNNfo - docs*" /f >nul 2>&1
timeout /t 1 /nobreak >nul
echo   Done.
echo.

REM ── Install dependencies if missing ──
if not exist "%ROOT%node_modules" (
    echo   Installing workspace dependencies...
    cd /d "%ROOT%" && call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo   ERROR: npm install failed!
        pause
        exit /b 1
    )
    echo.
)

REM ── Pre-build innfo-core (required by innfo-editor) ──
echo   Building @cognnitive/innfo-core...
cd /d "%ROOT%packages\innfo-core" && call npx tsc
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: innfo-core build failed!
    pause
    exit /b 1
)
echo.

echo Starting development servers...
echo.

echo   [innfo-editor] http://localhost:5174
start "innfo-editor" cmd /c "title innfo-editor && cd /d "%ROOT%" && npm run dev -w @cognnitive/innfo-editor -- --port 5174 --host"

echo   [docs]          http://localhost:8080
start "iNNfo - docs" cmd /c "title iNNfo - docs && cd /d "%ROOT%" && npx http-server docs/ -p 8080 -c-1 --silent"

echo.
echo +----------------------------------------------------+
echo ^|  Server            Window Title               URL  ^|
echo ^|  innfo-editor    - innfo-editor     - http://localhost:5174 ^|
echo ^|  docs            - iNNfo - docs - http://localhost:8080 ^|
echo +----------------------------------------------------+
echo.
echo Each server runs in its own window. Close the windows
echo or press any key here to stop all servers.
echo.
pause >nul

echo.
echo Stopping all servers...
taskkill /fi "WINDOWTITLE eq innfo-editor" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq iNNfo - docs" /f >nul 2>&1
echo Done.
echo.

endlocal

@echo off
setlocal
set ROOT=%~dp0
title Playwright E2E Runner - iNNfo

echo.
echo +----------------------------------------------------+
echo ^|   iNNfo â€” Playwright E2E Visual Runner        ^|
echo +----------------------------------------------------+
echo.

echo Starting Playwright UI mode...
cd /d "%ROOT%apps\innfo-editor" && call npm run test:e2e:ui

endlocal

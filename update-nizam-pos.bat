@echo off
setlocal
title Nizam Bags POS - Update & Deploy
cd /d "%~dp0"
echo ==========================================================
echo Starting Nizam Bags POS Update...
echo ==========================================================
if exist "%~dp0scripts\update-nizam-pos.ps1" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-nizam-pos.ps1" %*
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-nizam-pos.ps1" %*
)
echo.
pause

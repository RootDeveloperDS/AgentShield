@echo off
title AgentShield 1-Click Launcher
echo Starting AgentShield...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Script encountered an error.
    pause
)

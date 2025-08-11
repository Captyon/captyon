@echo off
REM run.bat - Simple one-click setup + run for Windows (non-technical users)
REM Place this file in the project root and double-click it to install deps and start the dev server.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows.ps1" -Action both
set "EXITCODE=%ERRORLEVEL%"

if "%EXITCODE%" NEQ "0" (
  echo.
  echo [ERROR] The setup or dev server exited with code %EXITCODE%.
  echo Check the PowerShell window for details.
  pause
) else (
  echo.
  echo [INFO] Completed successfully.
  pause
)

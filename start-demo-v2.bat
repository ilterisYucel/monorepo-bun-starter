@echo off
REM GD-PMS demo v2/dev: build + up + konteyner kaydi. Docker Desktop acik olmali.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-demo-v2.ps1"
if errorlevel 1 echo. & echo !!! HATA - ciktiyi Claudea gonder !!!
pause

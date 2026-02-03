@echo off
REM This script just wakes the PC - node-cron handles the actual digest
echo [%date% %time%] PC woken for digest >> "%~dp0wake.log"

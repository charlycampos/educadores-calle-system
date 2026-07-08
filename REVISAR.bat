@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Revision de carpetas - SONIA / WALTER

set "PY=services\nna-service-py\venv\Scripts\python.exe"

if not exist "%PY%" (
    echo No encontre el Python del sistema en:
    echo   %PY%
    echo Abre el sistema una vez con START.bat y vuelve a intentar.
    pause
    exit /b 1
)

"%PY%" revisar_carpetas.py

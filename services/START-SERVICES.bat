@echo off
title SEC - Iniciando Servicios Python
echo ================================================
echo   SISTEMA SEC - EDUCADORES DE CALLE
echo   Iniciando microservicios Python...
echo ================================================
echo.

SET BASE=%~dp0

REM ── auth-service-py (puerto 3001) ────────────────
echo [1/6] Iniciando auth-service-py en puerto 3001...
start "SEC auth-service :3001" cmd /k "cd /d %BASE%auth-service-py && venv\Scripts\activate && python main.py"
timeout /t 3 /nobreak >nul

REM ── nna-service-py (puerto 3002) ─────────────────
echo [2/6] Iniciando nna-service-py en puerto 3002...
start "SEC nna-service :3002" cmd /k "cd /d %BASE%nna-service-py && venv\Scripts\activate && python main.py"
timeout /t 2 /nobreak >nul

REM ── expediente-service-py (puerto 3006) ────────────
echo [3/6] Iniciando expediente-service-py en puerto 3006...
start "SEC expediente-service :3006" cmd /k "cd /d %BASE%expediente-service-py && venv\Scripts\activate && python main.py"
timeout /t 2 /nobreak >nul

REM ── derivacion-service-py (puerto 3004) ────────────
echo [4/6] Iniciando derivacion-service-py en puerto 3004...
start "SEC derivacion-service :3004" cmd /k "cd /d %BASE%derivacion-service-py && venv\Scripts\activate && python main.py"
timeout /t 2 /nobreak >nul

REM ── talleres-service-py (puerto 3005) ────────────
echo [5/6] Iniciando talleres-service-py en puerto 3005...
start "SEC talleres-service :3005" cmd /k "cd /d %BASE%talleres-service-py && venv\Scripts\activate && python main.py"
timeout /t 2 /nobreak >nul

REM ── intervencion-service-py (puerto 3003) ────────────
echo [6/6] Iniciando intervencion-service-py en puerto 3003...
start "SEC intervencion-service :3003" cmd /k "cd /d %BASE%intervencion-service-py && venv\Scripts\activate && python main.py"
timeout /t 2 /nobreak >nul

echo.
echo ================================================
echo   Servicios levantados:
echo   - auth-service          http://localhost:3001
echo   - nna-service           http://localhost:3002
echo   - intervencion-service  http://localhost:3003
echo   - derivacion-service    http://localhost:3004
echo   - talleres-service      http://localhost:3005
echo   - expediente-service    http://localhost:3006
echo ================================================
echo.
echo Presiona cualquier tecla para cerrar esta ventana
echo (los servicios seguiran corriendo en sus ventanas)
pause >nul

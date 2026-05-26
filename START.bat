@echo off
cd /d "%~dp0"
echo ========================================
echo     EDUCADORES DE CALLE - SISTEMA
echo ========================================
echo.

echo [0] Limpiando procesos antiguos (puertos 3001-3006, 5173)...
for %%p in (3001 3002 3003 3004 3005 3006 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p" ^| findstr /i "LISTENING ESCUCHANDO"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)
echo Limpieza completada.

echo [1] Iniciando cliente web (Frontend)...
start "Cliente Web - Puerto 5173" cmd /k "cd client && npm run dev"

echo.
echo [2] Iniciando microservicios Python...
start "Microservicios Python" cmd /k "cd services && START-SERVICES.bat"

echo.
echo ========================================
echo  El sistema se esta iniciando:
echo  - Frontend:              http://localhost:5173
echo  - auth-service (login):  http://localhost:3001
echo  - nna-service:           http://localhost:3002
echo  - intervencion-service:  http://localhost:3003
echo  - derivacion-service:    http://localhost:3004
echo  - talleres-service:      http://localhost:3005
echo  - expediente-service:    http://localhost:3006
echo ========================================
echo.
pause

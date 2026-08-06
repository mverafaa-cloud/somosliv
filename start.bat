@echo off
echo Iniciando entorno local de LIV...
cd /d "%~dp0"

REM Verifica que Netlify CLI este instalado globalmente
where netlify >nul 2>nul
if errorlevel 1 (
  echo Netlify CLI no esta instalado. Instalando...
  call npm install -g netlify-cli
)

REM Verifica que las deps de las functions esten
if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
)

echo.
echo Levantando servidor local en http://localhost:8888
echo Ctrl+C para detener.
echo.
call netlify dev

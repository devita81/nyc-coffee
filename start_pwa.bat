@echo off
REM ===========================================================
REM  NYC Coffee + Hotel Explorer - PWA local launcher (Windows)
REM ===========================================================
REM  Requer Python 3 instalado (https://www.python.org/downloads/)
REM  PWA precisa rodar via HTTP/HTTPS (file:// nao funciona).
REM ===========================================================

cd /d "%~dp0"
set PORT=8765
set URL=http://localhost:%PORT%/

echo.
echo  ============================================================
echo   NYC Coffee + Hotel Explorer - PWA
echo  ============================================================
echo   Servidor local rodando em: %URL%
echo   Para parar: feche esta janela (Ctrl+C)
echo  ============================================================
echo.

REM Abre o browser apos 1.5s (deixa o servidor subir)
start "" /b powershell -NoProfile -Command "Start-Sleep -Milliseconds 1500; Start-Process '%URL%'"

REM Tenta python3 primeiro, depois python
where python3 >nul 2>nul
if %errorlevel%==0 (
  python3 -m http.server %PORT% --bind 127.0.0.1
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python -m http.server %PORT% --bind 127.0.0.1
  ) else (
    echo.
    echo  ERRO: Python nao encontrado.
    echo  Instale Python 3 de https://www.python.org/downloads/
    echo  Marque "Add Python to PATH" durante a instalacao.
    echo.
    pause
    exit /b 1
  )
)

@echo off
chcp 65001 > nul
title Speech Translator
color 0A
cls

echo ╔══════════════════════════════════════╗
echo ║     Speech Translator - Starting     ║
echo ╚══════════════════════════════════════╝
echo.

SET ROOT=%~dp0
SET NODE=%ROOT%_runtime\node\node.exe
SET PYTHON=%ROOT%_runtime\python\python.exe

:: 1. Check Node.js runtime (Portable vs System)
IF EXIST "%NODE%" (
    echo [OK] Da tim thay Node.js portable.
    SET NODE_EXE="%NODE%"
    GOTO CHECK_PYTHON
)

where node >nul 2>nul
IF ERRORLEVEL 1 (
    echo [LOI] Khong tim thay Node.js portable trong _runtime\node\ va Node.js he thong cung khong co.
    echo Vui long tai va cai dat Node.js tai: https://nodejs.org/
    pause & exit
)

echo [THONG BAO] Khong co Node portable, su dung Node.js he thong.
SET NODE_EXE=node

:CHECK_PYTHON
:: 2. Check Python runtime (Portable vs System)
IF EXIST "%PYTHON%" (
    echo [OK] Da tim thay Python portable.
    SET PYTHON_EXE="%PYTHON%"
    GOTO START_SERVER
)

where python >nul 2>nul
IF ERRORLEVEL 1 (
    echo [LOI] Khong tim thay Python portable trong _runtime\python\ va Python he thong cung khong co.
    echo Vui long lien he nguoi gui de duoc ho tro.
    pause & exit
)

echo [THONG BAO] Khong co Python portable, su dung Python he thong.
SET PYTHON_EXE=python

:START_SERVER
echo [OK] Dang mo trinh duyet...
start http://localhost:3001

echo [OK] Dang khoi dong server...
echo ════════════════════════════════════════
echo  De tat app: dong cua so terminal nay
echo  hoac chay file stop.bat
echo ════════════════════════════════════════
echo.

:: Run Node in foreground (blocking) to display logs
%NODE_EXE% "%ROOT%server\server.js"

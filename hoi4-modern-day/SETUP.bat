@echo off
rem Builds the 2024 map from your own HOI4 files and installs the mod.
cd /d "%~dp0"
set PY=
where py >nul 2>nul && set PY=py -3
if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PY%"=="" (
  echo Python 3 is needed. Install it from https://www.python.org/downloads/
  echo ^(tick "Add python.exe to PATH" in the installer^), then run SETUP.bat again.
  pause
  exit /b 1
)
%PY% -m pip install --user --quiet pillow numpy
%PY% tools\setup_mod.py %*
pause

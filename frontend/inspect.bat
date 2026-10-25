@echo off
set "R=C:\Users\ranav\Desktop\hireready"
set "F=%R%\frontend"
set "O=%F%\_inspect_out.txt"
echo === ROUTES (src\routes) === > "%O%"
dir /a-d /b /s "%F%\src\routes" >> "%O%" 2>&1
echo. >> "%O%"
echo === THREE / R3F === >> "%O%"
if exist "%F%\node_modules\three" echo FOUND: frontend/node_modules/three >> "%O%" else echo NONE: frontend/node_modules/three >> "%O%"
if exist "%R%\node_modules\three" echo FOUND: root/node_modules/three >> "%O%" else echo NONE: root/node_modules/three >> "%O%"
if exist "%F%\node_modules\@react-three" echo FOUND: frontend/@react-three >> "%O%" else echo NONE: frontend/@react-three >> "%O%"
if exist "%R%\node_modules\@react-three" echo FOUND: root/@react-three >> "%O%" else echo NONE: root/@react-three >> "%O%"
echo. >> "%O%"
echo === ROOT (top level) === >> "%O%"
dir /a-d /b "%R%" >> "%O%" 2>&1
echo. >> "%O%"
echo === frontend/src (top level) === >> "%O%"
dir /a-d /b "%F%\src" >> "%O%" 2>&1
echo. >> "%O%"
echo === video files in repo (excluding node_modules) === >> "%O%"
for /f "delims=" %%i in ('dir /a-d /b /s "%F%" "%R%\docs" "%R%\public" 2^>nul ^| findstr /I /E ".mp4 .webm .mov .mkv .avi"') do echo %%i >> "%O%"
echo === END === >> "%O%"

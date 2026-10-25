@echo off
set "F=C:\Users\ranav\Desktop\hireready\frontend"
set "O=%F%\depcheck.txt"
> "%O%" echo === frontend/node_modules/three ===
if exist "%F%\node_modules\three" echo HAS >> "%O%" else echo NO >> "%O%"
>> "%O%" echo === frontend/node_modules/@types/three ===
if exist "%F%\node_modules\@types\three" echo HAS >> "%O%" else echo NO >> "%O%"
>> "%O%" echo === package-lock.json ===
if exist "%F%\package-lock.json" echo EXISTS >> "%O%" else echo MISSING >> "%O%"
>> "%O%" echo === versions ===
for /f "delims=" %%v in ('node -v 2^>nul') do echo node=%%v >> "%O%"
for /f "delims=" %%v in ('npm -v 2^>nul') do echo npm=%%v >> "%O%"
>> "%O%" echo === END ===

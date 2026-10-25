@echo off
set "R=C:\Users\ranav\Desktop\hireready"
set "F=%R%\frontend\src"
set "O=%R%\frontend\hero_grep.txt"
> "%O%" echo === hero-named files (frontend/src) ===
dir /b /s /a-d "%F%" 2>nul | findstr /I "hero" >> "%O%"
>> "%O%" echo === files mentioning 'hero' (frontend/src) ===
findstr /s /i /m "hero" "%F%" 2>nul >> "%O%"
>> "%O%" echo === files mentioning 'project-description' (frontend/src) ===
findstr /s /i /m "project-description" "%F%" 2>nul >> "%O%"
>> "%O%" echo === root app/ exists? ===
if exist "%R%\app" echo YES >> "%O%" else echo NO >> "%O%"
if exist "%R%\app" (
  >> "%O%" echo === files mentioning 'hero' (root app/) ===
  findstr /s /i /m "hero" "%R%\app" 2>nul >> "%O%"
  >> "%O%" echo === files mentioning 'project-description' (root app/) ===
  findstr /s /i /m "project-description" "%R%\app" 2>nul >> "%O%"
  >> "%O%" echo === root app/ files ===
  dir /b /s /a-d "%R%\app" 2>nul >> "%O%"
)
>> "%O%" echo === END ===

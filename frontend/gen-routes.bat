@echo off
cd /d C:\Users\ranav\Desktop\hireready\frontend
echo [gen-routes] Starting dev server...
start /b "" npm run dev
timeout /t 15 /nobreak > nul
echo [gen-routes] Killing process on port 8080...
for /f "tokens=2" %%a in ('netstat -aon ^| findstr :8080') do (
    taskkill /f /t /pid %%a 2>nul
)
echo [gen-routes] DEV_STOPPED

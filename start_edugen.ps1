# EduGen One-Click Startup Script
Write-Host "Starting EduGen Project..." -ForegroundColor Cyan

# 1. Start Backend (Main API on port 8001)
Write-Host "Starting Backend (FastAPI on :8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location backend; ..\venv\Scripts\activate; python main.py"

# 2. Start Admin Panel (on port 8002)
Write-Host "Starting Admin Panel (on :8002)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location backend; ..\venv\Scripts\activate; python admin_dashboard.py"

# 3. Start Frontend
Write-Host "Starting Frontend (Vite on :5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

# 4. Open Admin Panel in browser after a short delay
Start-Sleep -Seconds 4
Start-Process "http://localhost:8002"

Write-Host "All services are launching in separate windows." -ForegroundColor White
Write-Host "Main App  : http://localhost:5173" -ForegroundColor Blue
Write-Host "Admin Panel: http://localhost:8002" -ForegroundColor Blue

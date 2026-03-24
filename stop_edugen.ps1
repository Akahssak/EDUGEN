# EduGen Full Cleanup Script
Write-Host "Stopping all EduGen processes..." -ForegroundColor Red

# 1. Kill Python (Backend & Admin)
Write-Host "Stopping Backend/Admin (Python)..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Kill Node (Frontend)
Write-Host "Stopping Frontend (Node/Vite)..." -ForegroundColor Green
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Force Close Ports (8001, 8002, and 5173)
Write-Host "Clearing Ports..." -ForegroundColor White
$ports = @(8001, 8002, 5173)
foreach ($port in $ports) {
    Try {
        $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess | Select-Object -Unique
        foreach ($pId in $procIds) {
            Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue
            Write-Host "   - Port $port (PID $pId) freed." -ForegroundColor Cyan
        }
    } Catch {
        # Port not in use, skip
    }
}

Write-Host "Cleanup Complete. All EduGen terminals and ports are closed." -ForegroundColor White

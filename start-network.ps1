# Quick start script for network access

Write-Host "🚀 Starting CRM Application for Network Access..." -ForegroundColor Green
Write-Host ""

# Check if backend is running
$backendRunning = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*server.js*" }

if (-not $backendRunning) {
    Write-Host "Starting Backend Server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"
    Start-Sleep -Seconds 3
} else {
    Write-Host "✅ Backend already running" -ForegroundColor Green
}

# Start frontend
Write-Host ""
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Set-Location client
npm run dev


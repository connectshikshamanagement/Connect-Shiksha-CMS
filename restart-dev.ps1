# Restart script for network access
Write-Host "🔄 Stopping any running Next.js dev servers..." -ForegroundColor Yellow
Stop-Process -Name node -ErrorAction SilentlyContinue | Out-Null

Write-Host ""
Write-Host "🧹 Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path "client\.next") {
    Remove-Item -Recurse -Force "client\.next"
    Write-Host "✅ Cache cleared" -ForegroundColor Green
} else {
    Write-Host "⚠️  No cache to clear" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting Next.js dev server with network access..." -ForegroundColor Green
Write-Host "Access from other devices: http://192.168.1.2:3000" -ForegroundColor Cyan
Write-Host ""

cd client
npm run dev


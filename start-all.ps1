# VitalConnect — start all services
# Run from the project root: .\start-all.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backend = Join-Path $root "backend"

Write-Host ""
Write-Host "=== VitalConnect Startup ===" -ForegroundColor Cyan

# 1. Backend (also auto-starts STT on port 8000)
Write-Host "[1/2] Starting backend + STT service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; node src/server.js"

Start-Sleep -Seconds 3

# 2. Show Expo instructions
Write-Host "[2/2] Backend started. Run Expo in THIS window:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   npx expo start" -ForegroundColor Green
Write-Host ""
Write-Host "Then scan the QR code with Expo Go on your phone." -ForegroundColor White
Write-Host "Make sure the phone is on the same Wi-Fi as this PC." -ForegroundColor White
Write-Host ""
Write-Host "Health check URLs:" -ForegroundColor Cyan
Write-Host "  Backend: http://localhost:5001/api/health"
Write-Host "  STT:     http://localhost:8000/health"
Write-Host ""

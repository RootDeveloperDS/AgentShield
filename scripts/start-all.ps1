# scripts/start-all.ps1
# Master 1-Click Launch Script for AgentShield (Database, Backend API, and Frontend Dashboard)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             AgentShield — 1-Click System Launcher        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Environment files verification & sync
Write-Host "`n[Step 1/5] Checking environment configuration files..." -ForegroundColor Yellow
if (!(Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env" -Force
    Write-Host "Created root .env from .env.example" -ForegroundColor Green
}
if (!(Test-Path "backend\.env") -and (Test-Path ".env")) {
    Copy-Item ".env" "backend\.env" -Force
    Write-Host "Synced .env to backend/.env" -ForegroundColor Green
}
if (!(Test-Path "frontend\.env.local")) {
    Set-Content -Path "frontend\.env.local" -Value 'NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"'
    Write-Host "Configured frontend/.env.local (API at port 4000)" -ForegroundColor Green
}

# 2. Docker daemon check with graceful fallback
Write-Host "`n[Step 2/5] Checking Docker daemon status..." -ForegroundColor Yellow
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n----------------------------------------------------------" -ForegroundColor Red
    Write-Host "[!] DOCKER IS NOT RUNNING" -ForegroundColor Red
    Write-Host "----------------------------------------------------------" -ForegroundColor Red
    Write-Host "The Docker Desktop engine is not running on your computer." -ForegroundColor Yellow
    Write-Host "To fix this:" -ForegroundColor White
    Write-Host "  1. Open 'Docker Desktop' from your Windows Start Menu." -ForegroundColor White
    Write-Host "  2. Wait 15-20 seconds for the Docker whale icon to say 'Running'." -ForegroundColor White
    Write-Host "  3. Re-run this launcher.`n" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Docker is online and responsive." -ForegroundColor Green

# 3. Start PostgreSQL container & apply migrations
Write-Host "`n[Step 3/5] Starting PostgreSQL container & running Prisma migrations..." -ForegroundColor Yellow
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Failed to launch PostgreSQL container." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Generate Prisma client and migrate
npm run prisma:generate
npm run prisma:migrate
Write-Host "Database schema is synchronized." -ForegroundColor Green

# 4. Launch Backend API in dedicated window
Write-Host "`n[Step 4/5] Launching Backend API server (Port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$host.UI.RawUI.WindowTitle = 'AgentShield Backend API [Port 4000]'; npm run dev:backend"

# 5. Launch Frontend Dashboard in dedicated window
Write-Host "`n[Step 5/5] Launching Frontend Dashboard (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$host.UI.RawUI.WindowTitle = 'AgentShield Dashboard [Port 3000]'; npm run dev:frontend"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   AgentShield Platform is starting up successfully!      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Backend API:        http://localhost:4000/health" -ForegroundColor White
Write-Host "Frontend Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "Both servers are running in their respective command windows.`n" -ForegroundColor Gray

# Open browser to dashboard after short delay
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

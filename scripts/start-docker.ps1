# scripts/start-docker.ps1
# Starts the local PostgreSQL container and runs Prisma migrations

Write-Host "`n[1/3] Checking Docker daemon status..." -ForegroundColor Cyan

# Test if Docker daemon is responsive
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] Docker Desktop daemon is not running or not responding." -ForegroundColor Yellow
    Write-Host "Please start 'Docker Desktop' from your Windows Start menu and wait for it to report running, then rerun this script.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "Docker daemon is active." -ForegroundColor Green

Write-Host "`n[2/3] Starting PostgreSQL container (agentshield-postgres)..." -ForegroundColor Cyan
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] Failed to start postgres container. Please check Docker Desktop logs." -ForegroundColor Red
    exit 1
}

# Ensure environment files are synced
if (!(Test-Path "backend\.env") -and (Test-Path ".env")) {
    Copy-Item ".env" "backend\.env" -Force
}

Write-Host "`n[3/3] Generating Prisma client and running migrations..." -ForegroundColor Cyan
npm run prisma:generate
npm run prisma:migrate

Write-Host "`n[SUCCESS] PostgreSQL database is ready and migrations applied!`n" -ForegroundColor Green

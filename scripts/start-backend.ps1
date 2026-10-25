# scripts/start-backend.ps1
# Starts the Express API backend server on Port 4000

# Ensure backend/.env exists
if (!(Test-Path "backend\.env")) {
    if (Test-Path ".env") {
        Copy-Item ".env" "backend\.env" -Force
        Write-Host "Copied .env into backend/.env" -ForegroundColor Green
    } else {
        Copy-Item ".env.example" "backend\.env" -Force
        Write-Host "Created backend/.env from .env.example" -ForegroundColor Yellow
    }
}

Write-Host "`n[STARTING] AgentShield API Server on http://localhost:4000..." -ForegroundColor Cyan
npm run dev:backend

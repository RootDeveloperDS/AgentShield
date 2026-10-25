# scripts/start-frontend.ps1
# Starts the Next.js frontend dashboard on Port 3000

# Ensure frontend/.env.local exists
if (!(Test-Path "frontend\.env.local")) {
    Set-Content -Path "frontend\.env.local" -Value 'NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"'
    Write-Host "Created frontend/.env.local" -ForegroundColor Green
}

Write-Host "`n[STARTING] AgentShield Frontend Dashboard on http://localhost:3000..." -ForegroundColor Cyan
npm run dev:frontend

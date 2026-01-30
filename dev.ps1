# RendMD Development Server Launch Script
Write-Host "Starting RendMD Development Server..." -ForegroundColor Cyan
Write-Host ""

# Add Node.js to PATH if needed
$env:PATH = "$env:PATH;C:\Program Files\nodejs"

# Navigate to script directory
Set-Location $PSScriptRoot

# Start dev server
npm run dev

# NLP Component Local Server Launcher
# Usage: .\run.ps1

Write-Host "Starting local server for NLP component..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Once server starts, open: http://localhost:8000/nlp_component/" -ForegroundColor Green
Write-Host ""

# Change to parent directory
Set-Location ..

# Start Python HTTP server
python -m http.server 8000 --directory .

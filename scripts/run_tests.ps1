# Run backend and frontend verification tests

Write-Host "Running Backend Tests (pytest)..." -ForegroundColor Cyan
cd backend
.venv/Scripts/pytest tests -v
$backend_exit = $LASTEXITCODE
cd ..

Write-Host "`nRunning Frontend Typecheck & Build (tsc & vite)..." -ForegroundColor Cyan
cd frontend
npm run build
$frontend_exit = $LASTEXITCODE
cd ..

if ($backend_exit -eq 0 -and $frontend_exit -eq 0) {
    Write-Host "`n[SUCCESS] All backend and frontend checks passed cleanly!" -ForegroundColor Green
} else {
    Write-Host "`n[FAILURE] One or more test suites failed." -ForegroundColor Red
    exit 1
}

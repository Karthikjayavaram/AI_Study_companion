# Run AI Study Companion locally in development mode

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting AI Study Companion Development Environment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check backend venv
if (!(Test-Path "backend/.venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv backend/.venv
    backend/.venv/Scripts/pip install -r backend/requirements.txt
}

# Run alembic migrations
Write-Host "Running database migrations..." -ForegroundColor Green
cd backend
.venv/Scripts/alembic upgrade head
cd ..

Write-Host "Starting services:" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Yellow

# Start backend in a new process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .venv/Scripts/uvicorn app.main:app --reload --port 8000"

# Start frontend in current process
cd frontend
npm run dev

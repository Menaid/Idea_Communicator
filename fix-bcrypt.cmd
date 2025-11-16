@echo off
setlocal

echo ╔═══════════════════════════════════════════════╗
echo ║   Bcrypt Fix Script (Windows)                 ║
echo ║   Fixes native module compilation errors     ║
echo ╚═══════════════════════════════════════════════╝
echo.

echo This script will:
echo   1. Stop all containers
echo   2. Remove local node_modules (causing bcrypt error)
echo   3. Rebuild containers with fresh dependencies
echo   4. Start all services
echo.

set /p CONFIRM="Continue? (y/n): "
if /i not "%CONFIRM%"=="y" exit /b

echo.
echo [1/5] Stopping all containers...
docker-compose down
echo ✓ Containers stopped
echo.

echo [2/5] Removing local node_modules directories...
echo   This is necessary because bcrypt was compiled for Windows
echo   but needs to be compiled for Linux (in Docker container)
echo.

if exist "backend\node_modules\" (
    rmdir /s /q "backend\node_modules"
    echo ✓ Removed backend\node_modules
)

if exist "frontend\node_modules\" (
    rmdir /s /q "frontend\node_modules"
    echo ✓ Removed frontend\node_modules
)

if exist "webrtc\node_modules\" (
    rmdir /s /q "webrtc\node_modules"
    echo ✓ Removed webrtc\node_modules
)

if exist "ai-worker\node_modules\" (
    rmdir /s /q "ai-worker\node_modules"
    echo ✓ Removed ai-worker\node_modules
)

echo.

echo [3/5] Rebuilding backend container...
echo   This will install dependencies correctly inside the container
docker-compose build --no-cache api
echo ✓ Backend rebuilt
echo.

echo [4/5] Rebuilding frontend container...
docker-compose build --no-cache frontend
echo ✓ Frontend rebuilt
echo.

echo [5/5] Starting all services...
docker-compose up -d
echo ✓ Services started
echo.

echo Waiting for services to initialize (90 seconds)...
timeout /t 90 /nobreak >nul
echo ✓ Services should be ready
echo.

echo ╔═══════════════════════════════════════════════╗
echo ║   Testing backend...                          ║
echo ╚═══════════════════════════════════════════════╝
echo.

curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel%==0 (
    echo ✓ Backend is responding!
    curl -s http://localhost:3000/health
    echo.
    echo.
    echo SUCCESS! Backend is now working!
    echo.
    echo Next steps:
    echo   1. Run: test-api.sh
    echo   2. Open: http://localhost:5173
    echo   3. Open: http://localhost:3000/api/docs
) else (
    echo ✗ Backend is not responding yet
    echo.
    echo Check logs:
    echo   docker-compose logs api
    echo.
    echo If you see 'webpack compiled successfully', wait a bit longer
    echo Then try: curl http://localhost:3000/health
)

pause

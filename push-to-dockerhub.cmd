@echo off
REM Docker Hub Push Script for Idea Communicator (Windows)
REM This script tags and pushes all custom images to Docker Hub

set DOCKER_USERNAME=meno107
set VERSION=latest

echo ╔═══════════════════════════════════════════════╗
echo ║   Pushing Images to Docker Hub                ║
echo ╠═══════════════════════════════════════════════╣
echo ║   Username: %DOCKER_USERNAME%                      ║
echo ║   Version: %VERSION%                            ║
echo ╚═══════════════════════════════════════════════╝
echo.

echo Checking Docker Hub login status...
docker info | findstr "Username" > nul 2>&1
if errorlevel 1 (
    echo ⚠️  Not logged in to Docker Hub
    echo Please run: docker login
    exit /b 1
)

echo ✓ Logged in to Docker Hub
echo.

REM Tag and push API
echo [api] Tagging image...
docker tag ideacomm-api:latest %DOCKER_USERNAME%/ideacomm-api:%VERSION%
echo [api] ✓ Tagged
echo [api] Pushing to Docker Hub...
docker push %DOCKER_USERNAME%/ideacomm-api:%VERSION%
echo [api] ✓ Pushed
echo.

REM Tag and push Frontend
echo [frontend] Tagging image...
docker tag ideacomm-frontend:latest %DOCKER_USERNAME%/ideacomm-frontend:%VERSION%
echo [frontend] ✓ Tagged
echo [frontend] Pushing to Docker Hub...
docker push %DOCKER_USERNAME%/ideacomm-frontend:%VERSION%
echo [frontend] ✓ Pushed
echo.

REM Tag and push WebRTC
echo [webrtc] Tagging image...
docker tag ideacomm-webrtc:latest %DOCKER_USERNAME%/ideacomm-webrtc:%VERSION%
echo [webrtc] ✓ Tagged
echo [webrtc] Pushing to Docker Hub...
docker push %DOCKER_USERNAME%/ideacomm-webrtc:%VERSION%
echo [webrtc] ✓ Pushed
echo.

REM Tag and push AI Worker
echo [ai-worker] Tagging image...
docker tag ideacomm-ai-worker:latest %DOCKER_USERNAME%/ideacomm-ai-worker:%VERSION%
echo [ai-worker] ✓ Tagged
echo [ai-worker] Pushing to Docker Hub...
docker push %DOCKER_USERNAME%/ideacomm-ai-worker:%VERSION%
echo [ai-worker] ✓ Pushed
echo.

echo ╔═══════════════════════════════════════════════╗
echo ║   Docker Hub Push Complete!                   ║
echo ╠═══════════════════════════════════════════════╣
echo ║   Your images are now available at:           ║
echo ║   https://hub.docker.com/u/%DOCKER_USERNAME%       ║
echo ║                                               ║
echo ║   On another computer, run:                   ║
echo ║   1. Clone the repository                     ║
echo ║   2. Run: docker-compose pull                 ║
echo ║   3. Run: docker-compose up -d                ║
echo ╚═══════════════════════════════════════════════╝

pause

#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Bcrypt Fix Script                           ║${NC}"
echo -e "${BLUE}║   Fixes native module compilation errors     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}This script will:${NC}"
echo -e "  1. Stop all containers"
echo -e "  2. Remove local node_modules (causing bcrypt error)"
echo -e "  3. Rebuild containers with fresh dependencies"
echo -e "  4. Start all services"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

echo -e "${YELLOW}[1/5] Stopping all containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${YELLOW}[2/5] Removing local node_modules directories...${NC}"
echo "  This is necessary because bcrypt was compiled for Windows"
echo "  but needs to be compiled for Linux (in Docker container)"
echo ""

if [ -d "backend/node_modules" ]; then
    rm -rf backend/node_modules
    echo -e "${GREEN}✓ Removed backend/node_modules${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
    echo -e "${GREEN}✓ Removed frontend/node_modules${NC}"
fi

if [ -d "webrtc/node_modules" ]; then
    rm -rf webrtc/node_modules
    echo -e "${GREEN}✓ Removed webrtc/node_modules${NC}"
fi

if [ -d "ai-worker/node_modules" ]; then
    rm -rf ai-worker/node_modules
    echo -e "${GREEN}✓ Removed ai-worker/node_modules${NC}"
fi

echo ""

echo -e "${YELLOW}[3/5] Rebuilding backend container...${NC}"
echo "  This will install dependencies correctly inside the container"
docker-compose build --no-cache api
echo -e "${GREEN}✓ Backend rebuilt${NC}"
echo ""

echo -e "${YELLOW}[4/5] Rebuilding frontend container...${NC}"
docker-compose build --no-cache frontend
echo -e "${GREEN}✓ Frontend rebuilt${NC}"
echo ""

echo -e "${YELLOW}[5/5] Starting all services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo -e "${YELLOW}Waiting for services to initialize (90 seconds)...${NC}"
for i in {90..1}; do
    echo -ne "\r   ${i} seconds remaining...  "
    sleep 1
done
echo ""
echo -e "${GREEN}✓ Services should be ready${NC}"
echo ""

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing backend...                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Test backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding!${NC}"
    curl -s http://localhost:3000/health
    echo ""
    echo ""
    echo -e "${GREEN}SUCCESS! Backend is now working!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Run: ${YELLOW}./test-api.sh${NC}"
    echo -e "  2. Open: ${YELLOW}http://localhost:5173${NC}"
    echo -e "  3. Open: ${YELLOW}http://localhost:3000/api/docs${NC}"
else
    echo -e "${RED}✗ Backend is not responding yet${NC}"
    echo ""
    echo -e "${YELLOW}Check logs:${NC}"
    echo -e "  ${YELLOW}docker-compose logs api${NC}"
    echo ""
    echo -e "${YELLOW}If you see 'webpack compiled successfully', wait a bit longer${NC}"
    echo -e "${YELLOW}Then try: curl http://localhost:3000/health${NC}"
fi

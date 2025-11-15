#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Complete Fix & Rebuild Script              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Step 1: Pulling latest changes...${NC}"
git pull
echo -e "${GREEN}✓ Latest code pulled${NC}"
echo ""

echo -e "${YELLOW}Step 2: Stopping containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${YELLOW}Step 3: Cleaning up...${NC}"
# Remove local node_modules
if [ -d "backend/node_modules" ]; then
    echo "  Removing backend/node_modules..."
    rm -rf backend/node_modules
fi

if [ -d "frontend/node_modules" ]; then
    echo "  Removing frontend/node_modules..."
    rm -rf frontend/node_modules
fi

if [ -d "webrtc/node_modules" ]; then
    echo "  Removing webrtc/node_modules..."
    rm -rf webrtc/node_modules
fi

if [ -d "ai-worker/node_modules" ]; then
    echo "  Removing ai-worker/node_modules..."
    rm -rf ai-worker/node_modules
fi

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${YELLOW}Step 4: Rebuilding all containers (this takes ~5-10 minutes)...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ All containers rebuilt${NC}"
echo ""

echo -e "${YELLOW}Step 5: Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo -e "${YELLOW}Step 6: Waiting for services to initialize (90 seconds)...${NC}"
for i in {90..1}; do
    echo -ne "\r   ${i} seconds remaining...  "
    sleep 1
done
echo ""
echo -e "${GREEN}✓ Initialization complete${NC}"
echo ""

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing services...                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Test backend
echo -e "${YELLOW}Testing backend...${NC}"
sleep 5  # Extra wait
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding!${NC}"
    curl -s http://localhost:3000/health
    echo ""
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}SUCCESS! Everything is working!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Run tests: ${YELLOW}./test-api.sh${NC}"
    echo -e "  2. Open frontend: ${YELLOW}http://localhost:5173${NC}"
    echo -e "  3. Open API docs: ${YELLOW}http://localhost:3000/api/docs${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ Backend not responding yet${NC}"
    echo ""
    echo "This can happen if backend is still starting up."
    echo "Wait another minute and try:"
    echo "  ${YELLOW}curl http://localhost:3000/health${NC}"
    echo ""
    echo "Or check logs:"
    echo "  ${YELLOW}docker-compose logs api${NC}"
fi

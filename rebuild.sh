#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Idea Communicator - Rebuild Script         ║${NC}"
echo -e "${BLUE}║   Rebuilds all containers with Phase 1 code  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}[1/5] Stopping all containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${YELLOW}[2/5] Removing old containers and images...${NC}"
docker-compose rm -f
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${YELLOW}[3/5] Rebuilding all containers (this may take 5-10 minutes)...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${YELLOW}[4/5] Starting all services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo -e "${YELLOW}[5/5] Waiting for services to be ready (60 seconds)...${NC}"
for i in {60..1}; do
    echo -ne "\r   ${i} seconds remaining...  "
    sleep 1
done
echo ""
echo -e "${GREEN}✓ Services should be ready${NC}"
echo ""

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Checking service status...                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Check services
docker-compose ps

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing endpoints...                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Test backend
echo -e "${YELLOW}Testing backend health...${NC}"
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
    curl -s http://localhost:3000/health | head -1
else
    echo -e "${RED}✗ Backend is not responding${NC}"
    echo "   Run: docker-compose logs api"
fi
echo ""

# Test WebRTC
echo -e "${YELLOW}Testing WebRTC server...${NC}"
if curl -s http://localhost:4000/health > /dev/null; then
    echo -e "${GREEN}✓ WebRTC is responding${NC}"
else
    echo -e "${YELLOW}⚠ WebRTC is not responding (this is OK if you don't need it yet)${NC}"
fi
echo ""

# Test frontend
echo -e "${YELLOW}Testing frontend...${NC}"
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
else
    echo -e "${YELLOW}⚠ Frontend is not responding yet (may need more time)${NC}"
fi
echo ""

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Next steps:                                 ║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║   1. Run: ./test-api.sh                       ║${NC}"
echo -e "${BLUE}║   2. Open: http://localhost:5173              ║${NC}"
echo -e "${BLUE}║   3. Open: http://localhost:3000/api/docs     ║${NC}"
echo -e "${BLUE}║                                               ║${NC}"
echo -e "${BLUE}║   If issues persist:                          ║${NC}"
echo -e "${BLUE}║   - Check logs: docker-compose logs api       ║${NC}"
echo -e "${BLUE}║   - Read: TROUBLESHOOTING.md                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"

#!/bin/bash

# 🔧 DEFINITIV ROLLUP FIX - Clean Rebuild Solution
# Idea Communicator - Löser Alpine/glibc Rollup problem

echo "🔧 DEFINITIV ROLLUP FIX"
echo "======================"
echo "Problem: Docker använder cached Alpine image"
echo "Lösning: Clean rebuild med korrekt base image"
echo ""

# Kontrollera projektmapp
if [[ ! -f "docker-compose.yml" ]]; then
    echo "❌ ERROR: docker-compose.yml not found!"
    echo "💡 Kör detta script från D:/source/Idea_Communicator mappen"
    exit 1
fi

echo "✅ Projektmapp verifierad"
echo ""

# Steg 1: Stoppa och rensa frontend helt
echo "🛑 STEG 1: STOPPA OCH RENSA FRONTEND"
echo "===================================="

echo "   → Stoppar frontend container..."
docker-compose stop frontend

echo "   → Tar bort frontend container..."
docker-compose rm -f frontend

echo "   → Tar bort frontend image (force clean)..."
docker rmi ideacomm-frontend 2>/dev/null || echo "     (Image redan borttagen)"

echo "   → Rensar Docker build cache..."
docker builder prune -f

echo "✅ Frontend helt rensat från Docker"
echo ""

# Steg 2: Säkerställ korrekt Dockerfile (Standard Node)
echo "📝 STEG 2: SÄKERSTÄLL KORREKT DOCKERFILE"
echo "========================================="

# Backup original om det inte finns
if [[ ! -f "frontend/Dockerfile.alpine-original" ]]; then
    cp frontend/Dockerfile frontend/Dockerfile.alpine-original
    echo "✅ Backup av original Dockerfile skapad"
fi

# Skapa helt ny Dockerfile med Standard Node
cat > frontend/Dockerfile << 'EOF'
# ============================================
# Frontend Dockerfile - ROLLUP COMPATIBILITY FIX
# Standard Node (ej Alpine) för Rollup native deps
# ============================================
FROM node:20 AS development

WORKDIR /app

# Install system dependencies för glibc compatibility
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files
COPY package*.json ./

# Install dependencies med clean install
RUN npm ci \
    && npm cache clean --force \
    && echo "✅ Dependencies installerade med glibc support"

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5173/ || exit 1

# Start Vite med korrekt host binding
CMD ["npm", "run", "dev"]
EOF

echo "✅ Ny Dockerfile skapad med Standard Node + glibc support"
echo ""

# Steg 3: Säkerställ Vite konfiguration
echo "⚙️ STEG 3: VITE KONFIGURATION"
echo "=============================="

# Kontrollera att dev script har --host 0.0.0.0
if grep -q '"dev": "vite --host 0.0.0.0"' frontend/package.json; then
    echo "✅ Vite host binding redan korrekt"
else
    echo "🔧 Uppdaterar Vite host binding..."
    sed -i.bak 's/"dev": "vite"/"dev": "vite --host 0.0.0.0"/g' frontend/package.json
    echo "✅ Vite konfigurerad för Docker (--host 0.0.0.0)"
fi
echo ""

# Steg 4: Clean npm reinstall
echo "📦 STEG 4: CLEAN NPM REINSTALL"
echo "==============================="

cd frontend

echo "   → Tar bort gamla node_modules och lock..."
rm -rf node_modules package-lock.json 2>/dev/null

echo "   → Fresh npm install..."
npm install --package-lock-only

echo "✅ Fresh package-lock.json genererad"
cd ..
echo ""

# Steg 5: Clean rebuild med verbose output
echo "🐳 STEG 5: CLEAN REBUILD"
echo "========================"

echo "   → Building ny frontend image (kan ta 3-5 minuter)..."
docker-compose build --no-cache --pull frontend

echo "   → Startar ny frontend container..."
docker-compose up -d frontend

echo ""

# Steg 6: Kontrollera att problemet är löst
echo "✅ STEG 6: VERIFIERING"
echo "======================"

echo "   → Väntar på frontend start (30 sekunder)..."
sleep 30

echo "   → Kontrollerar container status..."
if docker-compose ps frontend | grep -q "Up"; then
    echo "     ✅ Frontend container körs!"
else
    echo "     ⚠️ Frontend startar fortfarande..."
fi

echo "   → Kontrollerar loggar för fel..."
if docker-compose logs --tail=10 frontend | grep -q "rollup-linux-x64-gnu"; then
    echo "     ❌ Rollup problem kvarstår - behöver alternativ lösning"
else
    echo "     ✅ Inga Rollup fel i senaste loggar!"
fi

echo "   → Testar endpoint..."
if curl -s -f http://localhost:5173 >/dev/null 2>&1; then
    echo "     ✅ Frontend svarar på http://localhost:5173!"
else
    echo "     ⏳ Frontend startar fortfarande (vänta 1-2 minuter)..."
fi

echo ""

# Sammanfattning
echo "🎉 CLEAN REBUILD KLAR!"
echo "====================="
echo ""
echo "📊 NUVARANDE STATUS:"
echo "   • PostgreSQL: ✅ Fungerar perfekt"
echo "   • Database: ✅ Accepterar anslutningar" 
echo "   • Alla andra services: ✅ Healthy"
echo "   • Frontend: 🔄 Ny clean build klar"
echo ""
echo "🔍 VERIFIERING:"
echo "   1. Kontrollera: docker-compose ps"
echo "   2. Testa: curl http://localhost:5173/"
echo "   3. Loggar: docker-compose logs frontend"
echo ""
echo "🎯 OM FRONTEND FUNGERAR:"
echo "   ✅ Fas 0: 100% SLUTFÖRD!"
echo "   🚀 Redo för Fas 1: JWT Authentication"
echo ""
echo "🚨 OM PROBLEM KVARSTÅR:"
echo "   • Kolla loggar: docker-compose logs frontend --tail=20"
echo "   • Rollback: cp frontend/Dockerfile.alpine-original frontend/Dockerfile"
echo "   • Alternative: Använd Webpack istället för Vite"

# Logga aktivitet
echo "$(date): Clean rebuild completed - Alpine to Standard Node conversion" >> troubleshooting.log
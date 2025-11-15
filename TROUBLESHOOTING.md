# Troubleshooting Guide - Phase 1

## Problem: 404 Not Found errors

If you get `Cannot POST /api/auth/register` or `Cannot GET /health`, it means the backend container needs to be rebuilt with the new Phase 1 code.

## Solution: Rebuild Containers

### Quick Fix (Recommended)

```bash
# Stop all containers
docker-compose down

# Rebuild all containers with new code
docker-compose up --build -d

# This will:
# - Install all npm dependencies in backend
# - Install all npm dependencies in frontend
# - Build all containers from scratch
# - Start all services

# Wait 60-90 seconds for everything to start
```

### Watch the startup logs

```bash
# Watch all logs
docker-compose logs -f

# Or watch specific services
docker-compose logs -f api
docker-compose logs -f frontend
```

**Look for these success messages:**

Backend (api):
```
Idea Communicator API
🚀 Server running on: http://localhost:3000
📚 API Docs: http://localhost:3000/api/docs
🌍 Environment: development
```

Frontend:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

WebRTC:
```
Idea Communicator WebRTC Server
🚀 Server running on: http://localhost:4000
```

### Verify it works

```bash
# Test backend health (should return JSON)
curl http://localhost:3000/health

# Test root endpoint
curl http://localhost:3000

# Test API docs (should return HTML)
curl http://localhost:3000/api/docs

# Test frontend (should return HTML)
curl http://localhost:5173
```

## Common Issues

### Issue 1: Port already in use

**Error:** `bind: address already in use`

**Solution:**
```bash
# Find what's using the port (example for port 3000)
# Windows (PowerShell):
netstat -ano | findstr :3000

# Kill the process or stop it

# Or change ports in .env file
```

### Issue 2: Dependencies not installing

**Error:** `Module not found` or `Cannot find module`

**Solution:**
```bash
# Force clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Issue 3: Database not ready

**Error:** `Connection refused` or `database "ideacomm" does not exist`

**Solution:**
```bash
# Wait longer - database takes 30-60 seconds to initialize
# Check database logs
docker-compose logs database

# If needed, restart just the database
docker-compose restart database
sleep 30
docker-compose restart api
```

### Issue 4: WebRTC not starting

**Error:** `Failed to connect to localhost port 4000`

**Solution:**
```bash
# Check logs
docker-compose logs webrtc

# Rebuild if needed
docker-compose up --build -d webrtc
```

### Issue 5: Build errors

**Error:** Build fails with npm errors

**Solution:**
```bash
# Clean everything
docker-compose down -v
docker system prune -f

# Remove node_modules in local folders (if any)
rm -rf backend/node_modules
rm -rf frontend/node_modules
rm -rf webrtc/node_modules
rm -rf ai-worker/node_modules

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

## Step-by-Step Debugging

### 1. Check what's running

```bash
docker-compose ps
```

Expected output - all services "Up" or "Up (healthy)":
- ideacomm-db
- ideacomm-redis
- ideacomm-storage
- ideacomm-api
- ideacomm-webrtc
- ideacomm-ai-worker
- ideacomm-frontend

### 2. Check individual service logs

```bash
# Backend
docker-compose logs api | tail -50

# Frontend
docker-compose logs frontend | tail -50

# Database
docker-compose logs database | tail -50
```

### 3. Check if backend is accessible

```bash
# Should return JSON health status
curl http://localhost:3000/health

# Should return JSON
curl http://localhost:3000

# Should return HTML (Swagger UI)
curl -I http://localhost:3000/api/docs
```

### 4. Enter container to debug

```bash
# Enter backend container
docker-compose exec api sh

# Inside container:
ls -la /app/src              # Should show auth, users, common folders
ls -la /app/node_modules     # Should have @nestjs packages
npm list --depth=0           # List installed packages
exit
```

### 5. Check environment variables

```bash
# View backend env
docker-compose exec api env | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV"
```

## Complete Clean Restart

If nothing else works:

```bash
# 1. Stop and remove everything
docker-compose down -v

# 2. Remove all images (optional but thorough)
docker-compose rm -f

# 3. Remove node_modules from local folders
rm -rf backend/node_modules frontend/node_modules webrtc/node_modules ai-worker/node_modules

# 4. Clean Docker system (removes unused images/containers)
docker system prune -af

# 5. Rebuild everything from scratch
docker-compose build --no-cache

# 6. Start services
docker-compose up -d

# 7. Wait 2 minutes for everything to initialize

# 8. Check logs
docker-compose logs -f
```

## Verify Everything Works

After rebuilding, run these checks:

```bash
# 1. All services running
docker-compose ps
# All should be "Up" or "Up (healthy)"

# 2. Backend health
curl http://localhost:3000/health
# Should return: {"status":"healthy",...}

# 3. Backend root
curl http://localhost:3000
# Should return: {"message":"Idea Communicator API","version":"0.1.0"}

# 4. WebRTC health
curl http://localhost:4000/health
# Should return: {"status":"healthy","service":"webrtc",...}

# 5. Frontend
curl http://localhost:5173
# Should return: HTML content

# 6. API Docs
curl -I http://localhost:3000/api/docs
# Should return: HTTP/1.1 200 OK

# 7. Run test script
./test-api.sh
# All tests should pass ✓
```

## If test-api.sh still fails

### Check exact endpoints:

```bash
# Manual registration test
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234!",
    "firstName": "Test",
    "lastName": "User",
    "dataRegion": "eu",
    "gdprConsentGiven": true
  }'

# Should return tokens and user data
```

If this returns 404, the backend code didn't load properly. Check:

```bash
# 1. Files exist in container
docker-compose exec api ls -la /app/src/auth
docker-compose exec api ls -la /app/src/users

# 2. TypeScript compiled
docker-compose exec api ls -la /app/dist

# 3. NestJS modules loaded
docker-compose logs api | grep -i "nest"
docker-compose logs api | grep -i "module"
```

## Last Resort: Fresh Start

```bash
# Download fresh code from git
git pull origin claude/setup-dev-environment-011CV4jXraB9xB5Gx9z9VxpN

# Complete clean
docker-compose down -v
docker system prune -af --volumes
rm -rf backend/node_modules frontend/node_modules webrtc/node_modules ai-worker/node_modules
rm -rf backend/dist frontend/dist

# Fresh build
docker-compose build --no-cache
docker-compose up -d

# Wait and check
sleep 120
docker-compose ps
curl http://localhost:3000/health
./test-api.sh
```

## Success Indicators

You know it's working when:
- ✅ `docker-compose ps` shows all services "Up"
- ✅ `curl http://localhost:3000/health` returns JSON
- ✅ `curl http://localhost:3000` returns API info
- ✅ `curl http://localhost:3000/api/docs` returns HTML
- ✅ `./test-api.sh` passes all tests
- ✅ Frontend accessible at http://localhost:5173
- ✅ Can register user via UI
- ✅ Can login and see dashboard

## Get Help

If still stuck:
1. Share output of: `docker-compose ps`
2. Share output of: `docker-compose logs api | tail -100`
3. Share output of: `curl -v http://localhost:3000/health`
4. Share your `.env` file (remove passwords!)

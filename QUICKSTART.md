# Quick Start Guide - Phase 1

Get the authentication system up and running in 5 minutes!

## Step 1: Start All Services (2 minutes)

```bash
# Make sure you're in the project root
cd /home/user/Idea_Communicator

# Start all Docker containers
docker-compose up -d

# Wait for services to be healthy (about 30-60 seconds)
# Watch the startup
docker-compose logs -f
# Press Ctrl+C when you see "Server running" messages
```

**Wait for these messages:**
- ✅ `ideacomm-db` - "database system is ready to accept connections"
- ✅ `ideacomm-redis` - "Ready to accept connections"
- ✅ `ideacomm-storage` - MinIO started
- ✅ `ideacomm-api` - "Server running on: http://localhost:3000"
- ✅ `ideacomm-frontend` - "VITE ... ready in ..."

## Step 2: Verify Services (30 seconds)

```bash
# Check all services are running
docker-compose ps

# Should show 7 services all "Up" or "Up (healthy)"
```

Quick health checks:
```bash
# Backend
curl http://localhost:3000/health

# WebRTC
curl http://localhost:4000/health
```

## Step 3: Test the API (1 minute)

Run the automated test script:

```bash
./test-api.sh
```

This will test:
- ✅ User registration
- ✅ User login
- ✅ Get current user
- ✅ Update profile
- ✅ Token refresh
- ✅ GDPR data export
- ✅ Logout

## Step 4: Test the Frontend (2 minutes)

### Open the app
Navigate to: **http://localhost:5173**

You'll be redirected to the login page.

### Register a new user
1. Click "create a new account"
2. Fill in the form:
   ```
   First Name: John
   Last Name: Doe
   Email: john@example.com
   Password: Password123!
   Confirm Password: Password123!
   Data Region: EU
   ☑ I accept the privacy policy
   ```
3. Click "Create account"

### Success!
You should now see the Dashboard with:
- ✅ Your name in the header
- ✅ Your account information
- ✅ Development status (Phase 0 & 1 complete)

### Try logging out and back in
1. Click "Logout" button
2. You'll be redirected to login
3. Enter your credentials
4. You're back in the dashboard!

## Step 5: Explore API Documentation (Optional)

Open: **http://localhost:3000/api/docs**

You'll see Swagger UI with all endpoints documented.

Try testing endpoints directly:
1. Click on `/api/auth/register`
2. Click "Try it out"
3. Modify the example JSON
4. Click "Execute"

## Common Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
```

### Restart a service
```bash
docker-compose restart api
docker-compose restart frontend
```

### Stop all services
```bash
docker-compose down
```

### Full reset (deletes all data!)
```bash
docker-compose down -v
docker-compose up -d
```

### Access database
```bash
docker-compose exec database psql -U ideacomm_user -d ideacomm

# Inside psql:
\dt                    # List tables
SELECT * FROM users;   # View users
\q                     # Exit
```

## What You Can Test

### ✅ Working Features
- User registration with GDPR consent
- User login with JWT tokens
- Protected routes (dashboard)
- Profile viewing
- Profile editing
- Password change (API)
- GDPR data export (API)
- Account deletion request (API)
- Logout
- Token auto-refresh
- Audit logging

### 🚧 Coming in Phase 2
- Group creation
- Chat messaging
- Real-time communication
- Online status

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker version

# Check logs
docker-compose logs database
docker-compose logs api

# Try full restart
docker-compose down
docker-compose up -d
```

### Frontend shows blank page
1. Check browser console for errors (F12)
2. Verify VITE_API_URL in frontend/.env
3. Check frontend logs: `docker-compose logs frontend`

### Can't login
1. Make sure you registered first
2. Check password is correct (min 8 characters)
3. Check backend logs: `docker-compose logs api`

### Database errors
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Wait for database to initialize (30 seconds)
```

## Next Steps

Once everything works:
1. ✅ Read [TESTING.md](./TESTING.md) for detailed testing guide
2. ✅ Explore API at http://localhost:3000/api/docs
3. ✅ Check database schema in PostgreSQL
4. ✅ Review code in backend/src and frontend/src
5. 🚀 Ready for Phase 2: Groups & Chat!

## Support

- 📖 Full testing guide: [TESTING.md](./TESTING.md)
- 📖 Project structure: [STRUCTURE.md](./STRUCTURE.md)
- 📖 Main documentation: [README.md](./README.md)

---

**Estimated time to get running: 5 minutes** ⏱️

**What you'll have:** A fully functional authentication system with JWT, GDPR compliance, and a beautiful UI! 🎉

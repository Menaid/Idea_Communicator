# Testing Guide - Phase 1: Authentication & Infrastructure

This guide will help you test all features implemented in Phase 1.

## Prerequisites

- Docker Desktop installed and running
- All services started via `docker-compose up -d`

## 1. Start All Services

```bash
# From project root
docker-compose up -d

# Check that all services are running
docker-compose ps

# Expected output: All services should be "Up" or "Up (healthy)"
```

## 2. Verify Services Health

### Check Backend API
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...,"environment":"development"}
```

### Check WebRTC Server
```bash
curl http://localhost:4000/health
# Expected: {"status":"healthy","timestamp":"...","service":"webrtc"}
```

### Check Frontend
```bash
curl http://localhost:5173
# Expected: HTML content
```

### View Logs
```bash
# Backend logs
docker-compose logs -f api

# Frontend logs
docker-compose logs -f frontend

# All logs
docker-compose logs -f
```

## 3. API Documentation (Swagger)

Open your browser and navigate to:
**http://localhost:3000/api/docs**

You'll see interactive API documentation where you can test all endpoints.

## 4. Test Registration (Frontend)

### Step 1: Open Frontend
Navigate to **http://localhost:5173**

You should be redirected to `/login` since you're not authenticated.

### Step 2: Go to Register
Click "create a new account" or navigate to **http://localhost:5173/register**

### Step 3: Fill Registration Form
```
First Name: Test
Last Name: User
Email: test@example.com
Password: Password123!
Confirm Password: Password123!
Data Region: EU (or your preference)
☑ I accept the privacy policy (required)
☐ Send me product updates (optional)
```

### Step 4: Submit
Click "Create account" button

**Expected Result:**
- Success toast notification
- Redirected to `/dashboard`
- See your user information displayed

## 5. Test Registration (API)

Using curl:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "SecurePass123!",
    "firstName": "API",
    "lastName": "Tester",
    "dataRegion": "eu",
    "gdprConsentGiven": true,
    "marketingConsent": false
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid-here",
    "email": "api-test@example.com",
    "firstName": "API",
    "lastName": "Tester",
    "role": "user",
    "dataRegion": "eu",
    ...
  }
}
```

## 6. Test Login (Frontend)

### Step 1: Logout (if logged in)
Click "Logout" button in dashboard

### Step 2: Login
Navigate to **http://localhost:5173/login**

Enter credentials:
```
Email: test@example.com
Password: Password123!
```

**Expected Result:**
- Success toast notification
- Redirected to `/dashboard`
- See your user information

## 7. Test Login (API)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Expected Response:**
Same format as registration response with tokens

## 8. Test Protected Endpoints

### Get Current User Info

```bash
# Replace YOUR_ACCESS_TOKEN with actual token from login/register response
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Profile

```bash
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }'
```

## 9. Test GDPR Features

### Export User Data

```bash
curl -X GET http://localhost:3000/api/users/me/export \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "user": { ...user data... },
  "auditTrail": [ ...all user actions... ],
  "exportDate": "2025-11-14T..."
}
```

### Request Account Deletion

```bash
curl -X DELETE http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Account deletion requested. Your account will be deleted within 30 days."
}
```

## 10. Test Password Change

```bash
curl -X POST http://localhost:3000/api/users/me/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Password123!",
    "newPassword": "NewPassword456!"
  }'
```

## 11. Test Token Refresh

```bash
# Replace YOUR_REFRESH_TOKEN with refresh token from login
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Response:**
New access token and refresh token

## 12. Test Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 13. Database Verification

### Access PostgreSQL

```bash
# Connect to database container
docker-compose exec database psql -U ideacomm_user -d ideacomm

# Inside psql:
# List all tables
\dt

# View users
SELECT id, email, "firstName", "lastName", role, "dataRegion", "gdprConsentGiven" FROM users;

# View audit logs
SELECT * FROM audit_logs ORDER BY "createdAt" DESC LIMIT 10;

# View refresh tokens
SELECT id, "userId", "expiresAt", "isRevoked" FROM refresh_tokens;

# Exit psql
\q
```

## 14. Test Error Scenarios

### Invalid Credentials
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword!"
  }'
```
**Expected:** 401 Unauthorized

### Duplicate Email
Try to register with an email that already exists.
**Expected:** 409 Conflict

### Missing GDPR Consent
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nogdpr@example.com",
    "password": "Password123!",
    "firstName": "No",
    "lastName": "Consent",
    "dataRegion": "eu",
    "gdprConsentGiven": false
  }'
```
**Expected:** 400 Bad Request - GDPR consent required

### Weak Password
Try registering with password less than 8 characters.
**Expected:** 400 Bad Request

### No Authorization Header
```bash
curl -X GET http://localhost:3000/api/users/me
```
**Expected:** 401 Unauthorized

### Invalid Token
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer invalid_token_here"
```
**Expected:** 401 Unauthorized

## 15. Frontend Testing Checklist

### Registration Flow
- [ ] Navigate to /register
- [ ] Fill valid form
- [ ] Check GDPR consent is required
- [ ] Submit and verify redirect to dashboard
- [ ] Verify user info displayed correctly
- [ ] Verify toast notification appears

### Login Flow
- [ ] Logout from dashboard
- [ ] Navigate to /login
- [ ] Enter valid credentials
- [ ] Verify redirect to dashboard
- [ ] Verify "Remember me" checkbox works
- [ ] Test "Forgot password" link (placeholder)

### Protected Routes
- [ ] Logout
- [ ] Try to access /dashboard directly
- [ ] Verify redirect to /login
- [ ] Login and verify access granted

### Token Refresh
- [ ] Login and get tokens
- [ ] Wait for token to expire (or modify expiry in code)
- [ ] Make an API call
- [ ] Verify token auto-refreshes without user action

### Error Handling
- [ ] Try login with wrong password
- [ ] Try register with existing email
- [ ] Try weak password
- [ ] Verify error toasts appear

## 16. Check Audit Logs (GDPR Compliance)

```sql
-- In PostgreSQL
SELECT
  al."action",
  u.email,
  al."entityType",
  al."metadata",
  al."createdAt"
FROM audit_logs al
LEFT JOIN users u ON u.id = al."userId"
ORDER BY al."createdAt" DESC
LIMIT 20;
```

**You should see entries for:**
- user_created
- user_login
- gdpr_consent_given
- password_changed (if tested)
- data_export_requested (if tested)
- deletion_requested (if tested)

## 17. Performance Testing (Optional)

### Load Test Login Endpoint
```bash
# Install apache bench if not installed
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install ab

# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -p login.json -T application/json http://localhost:3000/api/auth/login
```

Create `login.json`:
```json
{"email":"test@example.com","password":"Password123!"}
```

## 18. Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs api
docker-compose logs database

# Restart services
docker-compose restart

# Full reset
docker-compose down -v
docker-compose up -d
```

### Database connection errors
```bash
# Check database is healthy
docker-compose ps database

# View database logs
docker-compose logs database

# Verify connection string in .env
```

### Frontend can't connect to backend
- Verify VITE_API_URL in frontend/.env is correct
- Check CORS settings in backend/src/main.ts
- Ensure both services are running

### Tokens not working
- Check JWT_SECRET is set in .env
- Verify token format in Authorization header: `Bearer <token>`
- Check token expiry hasn't passed

## Success Criteria ✅

Phase 1 is working correctly if:
- ✅ User can register with GDPR consent
- ✅ User can login and receive JWT tokens
- ✅ Protected routes redirect to login when not authenticated
- ✅ Token refresh works automatically
- ✅ User can update profile
- ✅ User can change password
- ✅ User can export their data (GDPR)
- ✅ User can request account deletion
- ✅ All actions are logged in audit_logs table
- ✅ API documentation works at /api/docs
- ✅ Error messages are clear and helpful

## Next Steps

Once testing is complete, you're ready for:
**Phase 2: Groups & Chat** 🚀

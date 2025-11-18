# Phase 3 Frontend Testing Guide

**Date:** 2025-11-18
**Branch:** `claude/phase-3-frontend-ui-016sZBm7BMkQTPP1W4kLDGEL`
**Session:** Phase 3 Frontend UI Implementation

---

## 📋 What Was Implemented

### Frontend Video Call UI - COMPLETE ✅

**New Files Created (15 files, ~2,200 lines):**

1. **Types:**
   - `frontend/src/types/webrtc.types.ts` (160 lines) - TypeScript interfaces for WebRTC

2. **Services:**
   - `frontend/src/services/webrtc.service.ts` (340 lines) - mediasoup Device management
   - `frontend/src/services/signaling.service.ts` (240 lines) - Socket.IO signaling
   - `frontend/src/services/calls.service.ts` (120 lines) - Backend API integration

3. **Hooks:**
   - `frontend/src/hooks/useWebRTC.ts` (380 lines) - Main WebRTC connection hook
   - `frontend/src/hooks/useMediaDevices.ts` (160 lines) - Camera/microphone management
   - `frontend/src/hooks/useCallState.ts` (90 lines) - Call state management

4. **Components:**
   - `frontend/src/components/video/VideoCall.tsx` (230 lines) - Main call component
   - `frontend/src/components/video/VideoGrid.tsx` (110 lines) - Participant grid layout
   - `frontend/src/components/video/ParticipantVideo.tsx` (100 lines) - Single participant tile
   - `frontend/src/components/video/VideoControls.tsx` (180 lines) - Control buttons
   - `frontend/src/components/video/DeviceSelector.tsx` (140 lines) - Device settings modal

5. **Integration:**
   - `frontend/src/pages/ChatPage.tsx` (modified, +80 lines) - Integrated video call UI
   - `frontend/.env` (created) - Environment configuration

---

## 🚀 How to Test

### Prerequisites

1. **Backend, WebRTC, and Database running:**
   ```bash
   docker-compose up -d
   ```

2. **Verify services are running:**
   ```bash
   # Check WebRTC service
   curl http://localhost:4000/health
   # Expected: {"status":"healthy","timestamp":"...","service":"webrtc"}

   # Check WebRTC stats
   curl http://localhost:4000/stats
   # Expected: {"rooms":0,"peers":0,"workers":12}

   # Check Backend
   curl http://localhost:3000/health
   # Expected: OK
   ```

3. **Frontend dependencies installed:**
   ```bash
   cd frontend
   npm install
   ```

---

### Test Scenario 1: Two-User Video Call

**Setup:**
1. Open two browser windows (or one normal + one incognito)
2. Both windows should point to `http://localhost:5173`

**Steps:**

**Window 1 (User A):**
1. Register/Login as User A (e.g., alice@example.com)
2. Navigate to Chat page
3. Create a new group or select existing group
4. Click **"Start Call"** button in chat header
5. Allow camera/microphone permissions when prompted
6. You should see your own video in the grid

**Window 2 (User B):**
1. Register/Login as User B (e.g., bob@example.com)
2. Navigate to Chat page
3. Join the same group as User A
4. Click **"Start Call"** button (or you should see a call indicator)
5. Allow camera/microphone permissions when prompted
6. You should see both your video and User A's video

**Expected Results:**
- ✅ Both users see each other's video
- ✅ Audio works in both directions
- ✅ Video controls work (mute, camera off)
- ✅ Participant count shows "2 participants"

---

### Test Scenario 2: Control Buttons

**Test Mute:**
1. Click the microphone button
2. Icon should change to muted state
3. Red muted indicator should appear on your video tile
4. Other participant should not hear you

**Test Camera Off:**
1. Click the camera button
2. Your video should be replaced with avatar placeholder
3. Camera off indicator should appear
4. Other participant should see your avatar

**Test Screen Share:**
1. Click the screen share button
2. Select a window/screen to share
3. Your video should switch to screen content
4. Other participant should see your screen
5. Click again to stop sharing and return to camera

**Test Settings:**
1. Click the settings button
2. Device selector modal should appear
3. Change camera/microphone
4. Devices should update (may need to restart stream)

**Test Hang Up:**
1. Click the red hang up button
2. Should return to chat view
3. Other participant should see you leave
4. Video tracks should be stopped

---

### Test Scenario 3: Multi-Participant Call (3+ users)

**Setup:**
Open 3-4 browser windows/tabs

**Steps:**
1. Each user joins the same group
2. Each user clicks "Start Call"
3. Verify video grid adapts:
   - 2 users: 2 columns
   - 3-4 users: 2x2 grid
   - 5-9 users: 3x3 grid

**Expected Results:**
- ✅ Grid layout adjusts automatically
- ✅ All participants visible
- ✅ Participant count accurate

---

### Test Scenario 4: Connection Handling

**Test Disconnect:**
1. Start a call with 2 users
2. User A closes browser tab
3. User B should see User A disappear from grid
4. Participant count should update

**Test Rejoin:**
1. User A opens browser again
2. Login and navigate to chat
3. Click "Start Call"
4. Should rejoin the call successfully

**Test Network Issues:**
1. Use browser DevTools (F12) → Network tab
2. Throttle connection to "Slow 3G"
3. Call should continue (may degrade quality)
4. No crashes should occur

---

## 🐛 Troubleshooting

### Problem: "Device not loaded" error

**Solution:**
- Refresh the page
- Check that WebRTC service is running: `docker-compose ps webrtc`
- Check browser console for errors

### Problem: No video/audio

**Solution:**
1. Check camera/microphone permissions in browser
2. Verify devices are not in use by another app
3. Click settings button and select correct devices
4. Check browser console for errors

### Problem: "Connection Failed"

**Solution:**
1. Verify WebRTC service is running:
   ```bash
   docker-compose logs webrtc
   ```
2. Check that port 4000 is not blocked
3. Verify `VITE_WEBRTC_URL` in `frontend/.env`:
   ```
   VITE_WEBRTC_URL=http://localhost:4000
   ```

### Problem: Cannot hear audio

**Solution:**
1. Unmute if muted
2. Check system volume
3. Verify audio track is enabled (browser console)
4. Try selecting different microphone in settings

### Problem: "Socket.IO connection error"

**Solution:**
1. Check WebRTC logs: `docker-compose logs webrtc`
2. Verify CORS settings in `webrtc/src/index.ts`
3. Check that `FRONTEND_URL` env var is correct

---

## 📊 Expected Behavior

### Normal Flow:
1. User clicks "Start Call"
2. Backend creates Call entity
3. Frontend connects to WebRTC signaling server
4. mediasoup Device loads with router RTP capabilities
5. User joins room as peer
6. Send/receive transports created
7. Local media stream obtained
8. Local tracks published as producers
9. Existing producers consumed
10. Remote streams displayed in grid

### Network Events:
- **New Producer:** Remote participant starts camera/mic
- **Peer Closed:** Remote participant leaves
- **Producer Closed:** Remote participant stops camera/mic

---

## 🔍 Debugging

### Enable Verbose Logging:

**Frontend (browser console):**
All services and hooks log with `console.log`:
- `[WebRTC]` - webrtcService
- `[Signaling]` - signalingService
- `[useWebRTC]` - useWebRTC hook
- `[useMediaDevices]` - useMediaDevices hook
- `[VideoCall]` - VideoCall component

**Backend (WebRTC service):**
```bash
# Watch logs
docker-compose logs -f webrtc

# Expected output:
# [RoomManager] Room created: <callId>
# [RoomManager] Peer joined: <socketId>
# [RoomManager] Transport created: send
# [RoomManager] Producer created: <producerId>
```

### Check Stats:
```bash
curl http://localhost:4000/stats
```

Expected response:
```json
{
  "rooms": 1,
  "peers": 2,
  "workers": 12
}
```

---

## 📝 Known Limitations

1. **No TURN server** - May not work behind restrictive NATs
   - Solution: Add TURN server in production
   - For local testing: Should work on same network

2. **No recording** - Phase 4 feature
   - Recording functionality not implemented yet

3. **No AI processing** - Phase 5 feature
   - Transcription, translation not implemented yet

4. **Device hot-swap not fully supported**
   - Changing devices requires manual restart
   - Future: Implement seamless device switching

5. **No bandwidth adaptation**
   - No automatic quality adjustment
   - Future: Implement simulcast/SVC

---

## ✅ Test Checklist

- [ ] Two users can join a call
- [ ] Video is visible for both users
- [ ] Audio works in both directions
- [ ] Mute button works
- [ ] Camera off button works
- [ ] Screen share works
- [ ] Settings modal opens
- [ ] Device selection works
- [ ] Hang up button works
- [ ] 3+ participants grid layout works
- [ ] Participant leaves gracefully
- [ ] Reconnect after disconnect works
- [ ] No console errors
- [ ] No memory leaks (check DevTools Memory tab)

---

## 🎯 Performance Metrics

**Expected Performance:**
- **Connection time:** < 3 seconds
- **Video latency:** < 500ms
- **Audio latency:** < 300ms
- **CPU usage:** < 30% per participant (depends on device)
- **Memory usage:** ~50-100MB per participant

**Browser Compatibility:**
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (with some limitations)
- ❌ IE11 (not supported)

---

## 🚀 Next Steps

After testing is complete:

1. **Fix any bugs found**
2. **Add error boundaries for better error handling**
3. **Implement call notifications** (incoming call alerts)
4. **Add call history UI** (list past calls)
5. **Implement TURN server** for production
6. **Add recording** (Phase 4)
7. **Add AI features** (Phase 5)

---

## 📚 Additional Resources

**mediasoup Client:**
- Docs: https://mediasoup.org/documentation/v3/mediasoup-client/api/

**WebRTC:**
- MDN Guide: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API

**React Hooks:**
- Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks

---

**Happy Testing!** 🎉

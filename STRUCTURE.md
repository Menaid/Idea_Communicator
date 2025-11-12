# Project Structure

## Overview

```
Idea_Communicator/
├── backend/                    # NestJS Backend API
│   ├── src/
│   │   ├── auth/              # Authentication module (Phase 1)
│   │   ├── users/             # User management (Phase 1)
│   │   ├── groups/            # Group management (Phase 2)
│   │   ├── messages/          # Messaging (Phase 2)
│   │   ├── calls/             # Video/Audio calls (Phase 3)
│   │   ├── recordings/        # Recording management (Phase 4)
│   │   ├── ai/                # AI integration (Phase 5)
│   │   ├── common/            # Shared utilities
│   │   ├── config/            # Configuration files
│   │   ├── app.module.ts      # Main application module
│   │   ├── app.controller.ts  # Root controller
│   │   ├── app.service.ts     # Root service
│   │   └── main.ts            # Application entry point
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── frontend/                   # React + TypeScript PWA
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── auth/         # Auth components
│   │   │   ├── chat/         # Chat components
│   │   │   ├── video/        # Video call components
│   │   │   ├── groups/       # Group components
│   │   │   └── ui/           # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   ├── contexts/         # React contexts
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript types
│   │   ├── pages/            # Page components
│   │   ├── App.tsx           # Main App component
│   │   ├── main.tsx          # Application entry
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── Dockerfile
│   ├── nginx.conf            # Nginx config for production
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── webrtc/                     # mediasoup WebRTC Server
│   ├── src/
│   │   ├── lib/              # Utility libraries
│   │   │   └── logger.ts     # Logging utility
│   │   ├── config/           # Configuration
│   │   │   └── index.ts      # Main config
│   │   └── index.ts          # Server entry point
│   ├── types/                # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── ai-worker/                  # AI Processing Worker
│   ├── src/
│   │   ├── processors/       # Job processors
│   │   │   ├── transcription.processor.ts
│   │   │   └── summarization.processor.ts
│   │   ├── services/         # External services
│   │   ├── config/           # Configuration
│   │   │   └── logger.ts     # Logging utility
│   │   └── index.ts          # Worker entry point
│   ├── temp/                 # Temporary files
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── database/                   # Database configuration
│   └── init/
│       └── 01-init.sql       # Database initialization script
│
├── docker-compose.yml          # Docker Compose configuration
├── .env                        # Environment variables (development)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── .dockerignore              # Docker ignore rules
├── README.md                  # Main documentation
└── STRUCTURE.md               # This file

```

## Services Architecture

### 1. Frontend (Port 5173)
- **Technology**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA plugin
- **State**: Zustand + TanStack Query
- **WebSocket**: Socket.IO Client

### 2. Backend API (Port 3000)
- **Framework**: NestJS
- **Database**: PostgreSQL + TypeORM
- **Auth**: JWT + Passport
- **WebSocket**: Socket.IO
- **Queue**: Bull (Redis)
- **Storage**: MinIO client
- **API Docs**: Swagger/OpenAPI

### 3. WebRTC Server (Port 4000)
- **Media**: mediasoup
- **Signaling**: Socket.IO
- **State**: Redis
- **Ports**: 40000-40100 (RTP)

### 4. AI Worker (Background)
- **Queue**: Bull (Redis)
- **Transcription**: OpenAI Whisper / Deepgram
- **Summarization**: Anthropic Claude / Mistral
- **Storage**: MinIO for audio files

### 5. PostgreSQL (Port 5432)
- **Version**: 16 Alpine
- **Extensions**: uuid-ossp, pg_trgm
- **ORM**: TypeORM (auto-sync in dev)

### 6. Redis (Port 6379)
- **Version**: 7 Alpine
- **Usage**: Queue, cache, pub/sub

### 7. MinIO (Ports 9000, 9001)
- **API**: 9000
- **Console**: 9001
- **Buckets**: recordings, transcriptions, avatars

## Data Flow

### Real-time Chat
```
Frontend → WebSocket → Backend API → Redis Pub/Sub → Other Clients
```

### Video Call
```
Frontend → WebRTC Signaling (Socket.IO) → WebRTC Server → mediasoup → RTP Stream
```

### Recording & AI Processing
```
WebRTC Server → MinIO (audio file)
              → Backend API → Bull Queue
              → AI Worker → Transcription → Summarization
              → PostgreSQL → Frontend (notification)
```

## Environment Variables

See `.env.example` for all configuration options.

### Critical Settings

1. **Security**: Change all default passwords
2. **API Keys**: Add OpenAI and Anthropic keys
3. **WebRTC**: Set ANNOUNCED_IP for production
4. **Region**: Configure DATA_REGION for GDPR

## Next Steps

After Phase 0 completion:

1. **Phase 1**: Backend Infrastructure
   - User authentication (JWT)
   - User management
   - Database schema
   - API endpoints

2. **Phase 2**: Groups & Chat
   - Group creation/management
   - Real-time messaging
   - WebSocket integration

3. **Phase 3**: Video & Audio
   - WebRTC integration
   - Media routing
   - Call management

4. **Phase 4**: Recording
   - Audio/video recording
   - Storage management
   - Retention policies

5. **Phase 5**: AI Processing
   - Transcription pipeline
   - Summarization
   - Search functionality

6. **Phase 6**: UX Polish
   - Notifications
   - Responsive design
   - Onboarding

7. **Phase 7**: Production
   - Security hardening
   - Performance optimization
   - Deployment setup
   - Monitoring

## Development Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f [service]

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up --build

# Remove all data (WARNING!)
docker-compose down -v
```

## Health Checks

- Backend: http://localhost:3000/health
- WebRTC: http://localhost:4000/health
- MinIO: http://localhost:9000/minio/health/live
- Frontend: http://localhost:5173

## Documentation

- API Docs: http://localhost:3000/api/docs (when backend is running)
- MinIO Console: http://localhost:9001

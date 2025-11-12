# Idea Communicator

AI-powered communication app for teams with automatic recording, transcription, and summarization.

## 📋 Project Overview

Idea Communicator is an innovative communication platform designed for small to medium-sized organizations (5-500 employees). It combines traditional chat and video meetings with AI-driven recording, transcription, and summarization capabilities.

### Key Features (Planned)

- 👥 Group chat and video/audio calls
- 🎥 Automatic meeting recording
- 📝 AI-powered transcription (OpenAI Whisper / Deepgram)
- 💡 Intelligent summarization (Anthropic Claude / Mistral AI)
- 🔒 Maximum privacy control (choose storage region and AI provider)
- 🇪🇺 EU-first approach with GDPR compliance
- 📱 Progressive Web App (PWA)

## 🏗️ Architecture

### Services

The application consists of 7 Docker containers:

1. **Frontend** - React + TypeScript PWA (Vite)
2. **Backend API** - NestJS with TypeORM
3. **WebRTC Server** - mediasoup for video/audio
4. **Database** - PostgreSQL 16
5. **Storage** - MinIO (S3-compatible)
6. **Redis** - Queue & cache
7. **AI Worker** - Background processing for transcription & summarization

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Socket.IO Client
- **Backend**: NestJS, TypeORM, PostgreSQL, Socket.IO
- **WebRTC**: mediasoup
- **Storage**: MinIO (S3-compatible)
- **Queue**: Bull (Redis-based)
- **AI**: OpenAI Whisper, Anthropic Claude

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (v20.10+)
- [Node.js](https://nodejs.org/) (v20+) - for local development
- [Git](https://git-scm.com/)
- A code editor (VS Code recommended)

### Quick Start

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd Idea_Communicator
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and update the following **required** values:

```env
# Change all passwords from default values
POSTGRES_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_secure_password_here
MINIO_ROOT_PASSWORD=your_secure_password_here
JWT_SECRET=your_very_long_random_string_minimum_32_characters

# Add your API keys (required for AI features in Phase 5)
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

3. **Start the services**

```bash
docker-compose up -d
```

This will start all services in the background. First run will take 5-10 minutes to build all images.

4. **Install dependencies** (for local development)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# WebRTC
cd ../webrtc
npm install

# AI Worker
cd ../ai-worker
npm install
```

5. **Access the application**

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **WebRTC Server**: http://localhost:4000
- **MinIO Console**: http://localhost:9001 (login: minioadmin / your_password)

## 📦 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | React development server |
| Backend API | 3000 | NestJS API |
| WebRTC | 4000 | mediasoup server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Queue & cache |
| MinIO API | 9000 | S3-compatible storage |
| MinIO Console | 9001 | MinIO admin UI |

## 🛠️ Development

### Running in Development Mode

All services are configured for hot-reload in development:

```bash
# Start all services
docker-compose up

# Or start individual services
docker-compose up frontend
docker-compose up api
docker-compose up webrtc
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## 📝 Development Phases

This project follows a structured 7-phase development plan:

- ✅ **Phase 0**: Development Environment Setup (COMPLETED)
- ⏳ **Phase 1**: Infrastructure (Backend API, Database, Auth) - 1-2 weeks
- ⏳ **Phase 2**: Groups & Chat - 2-3 weeks
- ⏳ **Phase 3**: Video & Audio Calls - 3-4 weeks
- ⏳ **Phase 4**: Recording - 2-3 weeks
- ⏳ **Phase 5**: AI Processing - 3-4 weeks
- ⏳ **Phase 6**: UX & Notifications - 2 weeks
- ⏳ **Phase 7**: Production Ready - 2-3 weeks

**Total Estimated Time**: 15-20 weeks (4-5 months)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests (will be added in later phases)
npm run test:e2e
```

## 🔒 Security & GDPR

This application is designed with GDPR compliance in mind:

- ✅ Data encryption (AES-256 for stored data, E2E for meetings)
- ✅ Audit logging
- ✅ User consent management
- ✅ Data retention policies
- ✅ Right to deletion (30 days)
- ✅ Data portability
- ✅ Regional data storage options

**Important**: Before production deployment, ensure you have:
- Appointed a Data Protection Officer (DPO)
- Completed Data Protection Impact Assessment (DPIA)
- Implemented incident response procedures
- Reviewed and updated privacy policy

## 🌍 Production Deployment

### Recommended Hosting: Hetzner (Germany)

For EU-based hosting with GDPR compliance:

1. **Server Requirements** (MVP):
   - 4 vCPU
   - 8 GB RAM
   - 160 GB SSD
   - Cost: ~€25-50/month

2. **Deployment Steps** (detailed guide in Phase 7):
   - Set up Docker on server
   - Configure SSL certificates (Let's Encrypt)
   - Set up nginx reverse proxy
   - Configure firewall
   - Set up monitoring & backups

## 📚 API Documentation

Once the backend is running, visit:

**Swagger UI**: http://localhost:3000/api/docs

The API documentation is auto-generated from NestJS controllers and will be fully populated in Phase 1.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainer.

## 📄 License

UNLICENSED - Private project

## 🔗 Useful Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [mediasoup Documentation](https://mediasoup.org/documentation/)
- [Docker Documentation](https://docs.docker.com/)
- [TypeORM Documentation](https://typeorm.io/)

## 📞 Support

For support or questions:
- Check the API documentation at `/api/docs`
- Review logs: `docker-compose logs -f <service>`
- Contact: [Your contact information]

---

**Current Status**: Phase 0 Complete ✅

**Next Steps**:
1. Verify all services are running: `docker-compose ps`
2. Check service health: Visit http://localhost:3000/health
3. Begin Phase 1: Infrastructure & Authentication

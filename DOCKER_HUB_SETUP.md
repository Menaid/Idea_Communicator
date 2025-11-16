# Docker Hub Setup Guide

This guide explains how to use pre-built Docker images from Docker Hub on any computer.

## For the Original Computer (Where You Build)

### Step 1: Push Images to Docker Hub

Make sure you're logged in to Docker Hub:

```bash
docker login
```

Run the push script:

**On Linux/Mac:**
```bash
chmod +x push-to-dockerhub.sh
./push-to-dockerhub.sh
```

**On Windows:**
```cmd
push-to-dockerhub.cmd
```

This will:
- Tag all 4 custom images (api, frontend, webrtc, ai-worker)
- Push them to Docker Hub under `meno107/ideacomm-*:latest`
- Take about 10-20 minutes depending on your internet speed

### Step 2: Verify Upload

Visit https://hub.docker.com/u/meno107 to see your uploaded images.

---

## For Any Other Computer (Fresh Setup)

### Prerequisites
- Docker and Docker Compose installed
- Git installed

### Quick Start (5 minutes)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Idea_Communicator
   ```

2. **Pull pre-built images:**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   ```

3. **Start the application:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api/docs

### What's Different?

- **No build time!** - Images are downloaded pre-built from Docker Hub
- **Faster setup** - No need to compile TypeScript, install node_modules, etc.
- **Same functionality** - Everything works exactly the same

---

## Comparison: Development vs Production

### Development (docker-compose.yml)
- **Builds** images from source code
- **Hot reload** enabled (code changes reflect immediately)
- **Volume mounts** for live code editing
- **Use when:** You're actively developing

```bash
docker compose up -d
```

### Production (docker-compose.prod.yml)
- **Pulls** pre-built images from Docker Hub
- **No hot reload** (production mode)
- **No source code needed** (except config files)
- **Use when:** Deploying to another computer or production server

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Updating Images

When you make changes and want to update the images on Docker Hub:

1. **Rebuild locally:**
   ```bash
   docker compose build
   ```

2. **Re-push to Docker Hub:**
   ```bash
   ./push-to-dockerhub.sh
   ```

3. **On other computers, pull updates:**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## Image Sizes

- `meno107/ideacomm-api`: ~1.5 GB
- `meno107/ideacomm-frontend`: ~960 MB
- `meno107/ideacomm-webrtc`: ~1.1 GB
- `meno107/ideacomm-ai-worker`: ~1.3 GB
- **Total:** ~4.8 GB

**Note:** First download takes time, but Docker caches layers so updates are faster.

---

## Troubleshooting

### "Error: pull access denied"
Make sure the images are public on Docker Hub:
1. Go to https://hub.docker.com
2. Click on each repository
3. Settings → Make Public

### "Port already in use"
Stop existing containers:
```bash
docker compose -f docker-compose.prod.yml down
```

### "No space left on device"
Clean up old images:
```bash
docker system prune -a
```

---

## Need Help?

- Check Docker Hub: https://hub.docker.com/u/meno107
- View logs: `docker compose -f docker-compose.prod.yml logs`
- Restart services: `docker compose -f docker-compose.prod.yml restart`

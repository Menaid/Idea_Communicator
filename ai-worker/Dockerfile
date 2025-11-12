# ============================================
# Development Stage
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ ffmpeg

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create temp directory
RUN mkdir -p /app/temp && chmod 777 /app/temp

# Start development server
CMD ["npm", "run", "start:dev"]

# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Install runtime dependencies (including ffmpeg for audio processing)
RUN apk add --no-cache ffmpeg

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aiworker -u 1001

# Copy built application
COPY --from=build --chown=aiworker:nodejs /app/dist ./dist
COPY --from=build --chown=aiworker:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=aiworker:nodejs /app/package*.json ./

# Create temp directory
RUN mkdir -p /app/temp && chown -R aiworker:nodejs /app/temp

# Switch to non-root user
USER aiworker

# Health check (check if worker is processing jobs)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(() => process.exit(0)).catch(() => process.exit(1));"

# Start application
CMD ["node", "dist/index.js"]

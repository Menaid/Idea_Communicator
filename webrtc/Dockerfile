# ============================================
# WebRTC Server Dockerfile
# Idea Communicator - mediasoup SFU Server
# ============================================

# ============================================
# Development Stage
# ============================================
FROM node:20 AS development

WORKDIR /app

# Install system dependencies required by mediasoup
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for ts-node-dev)
RUN npm ci \
    && echo "✅ WebRTC dependencies installed"

# Copy source code
COPY . .

# Expose WebRTC server port
EXPOSE 4000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start development server with ts-node-dev
CMD ["npm", "run", "start:dev"]

# ============================================
# Build Stage
# ============================================
FROM node:20 AS build

WORKDIR /app

# Install system dependencies required by mediasoup
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build \
    && echo "✅ WebRTC build completed"

# ============================================
# Production Stage
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Install system dependencies required by mediasoup at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production \
    && echo "✅ Production dependencies installed"

# Copy built code from build stage
COPY --from=build /app/dist ./dist

# Non-root user for security
RUN groupadd -r webrtc && useradd -r -g webrtc webrtc
RUN chown -R webrtc:webrtc /app
USER webrtc

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start server
CMD ["npm", "start"]

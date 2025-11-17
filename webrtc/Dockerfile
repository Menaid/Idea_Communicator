# ============================================
# Development Stage
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies for mediasoup (requires build tools)
RUN apk add --no-cache python3 make g++ linux-headers

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose ports
EXPOSE 4000
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

# Start development server
CMD ["npm", "run", "start:dev"]

# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies for mediasoup
RUN apk add --no-cache python3 make g++ linux-headers

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

# Install runtime dependencies for mediasoup
RUN apk add --no-cache python3 linux-headers

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S webrtc -u 1001

# Copy built application
COPY --from=build --chown=webrtc:nodejs /app/dist ./dist
COPY --from=build --chown=webrtc:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=webrtc:nodejs /app/package*.json ./

# Switch to non-root user
USER webrtc

# Expose ports
EXPOSE 4000
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

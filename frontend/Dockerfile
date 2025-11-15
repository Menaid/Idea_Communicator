# ============================================
# Frontend Dockerfile - ROLLUP COMPATIBILITY FIX
# Standard Node (ej Alpine) för Rollup native deps
# ============================================
FROM node:20 AS development

WORKDIR /app

# Install system dependencies för glibc compatibility
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files
COPY package*.json ./

# Install dependencies med clean install
RUN npm ci \
    && npm cache clean --force \
    && echo "✅ Dependencies installerade med glibc support"

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5173/ || exit 1

# Start Vite med korrekt host binding
CMD ["npm", "run", "dev"]

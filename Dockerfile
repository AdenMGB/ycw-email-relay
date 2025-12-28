# Multi-stage build for YCW Email Relay Service

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
# Note: If pnpm-lock.yaml is out of sync with package.json, it will be regenerated during install
COPY package.json pnpm-lock.yaml ./

# Install dependencies
# --no-frozen-lockfile allows pnpm to update the lockfile if it's out of sync
# This handles cases where dependencies changed but lockfile wasn't updated
RUN pnpm install --no-frozen-lockfile

# Copy source files
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src

# Build TypeScript
RUN pnpm build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and the updated lockfile from builder stage
COPY package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies only
# Use the lockfile generated/updated in the builder stage
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create database directory with proper permissions
RUN mkdir -p /app/database && \
    chown -R nodejs:nodejs /app

# Create entrypoint script that fixes permissions then runs as nodejs user
# This handles cases where volume mounts override permissions
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo '# Fix permissions for database directory (needed when using volume mounts)' >> /app/entrypoint.sh && \
    echo 'mkdir -p /app/database' >> /app/entrypoint.sh && \
    echo 'chown -R nodejs:nodejs /app/database 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'chmod -R 755 /app/database 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo '# Switch to nodejs user and run the application' >> /app/entrypoint.sh && \
    echo 'exec su-exec nodejs sh -c "node dist/database/migrate.js && node dist/index.js"' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Install su-exec for switching users
RUN apk add --no-cache su-exec

# Keep as root for entrypoint script to fix permissions
# USER nodejs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations and start server
CMD ["/app/entrypoint.sh"]


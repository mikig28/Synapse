FROM node:20-alpine

# Note: Using Alpine Linux for smaller image size

# Install necessary dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Create non-root user with home directory and proper permissions
RUN addgroup -g 1001 nodeuser && \
    adduser -D -u 1001 -G nodeuser -h /home/nodeuser -s /bin/sh nodeuser && \
    mkdir -p /home/nodeuser/.local/share/applications && \
    chown -R nodeuser:nodeuser /home/nodeuser

WORKDIR /app

# Set environment variables for Node.js
ENV HOME=/home/nodeuser
# Reduce memory limit for Render's constraints
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy package files from backend directory
COPY src/backend/package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy source code and config files from backend directory
COPY src/backend/src/ ./src/
COPY src/backend/tsconfig.json ./
COPY src/backend/public/ ./public/

# Create uploads directory
RUN mkdir -p ./public/uploads

# Build the application
RUN echo "Starting TypeScript build..." && \
    echo "Current directory: $(pwd)" && \
    echo "Package.json check:" && \
    grep -A 5 '"build"' package.json && \
    npm run build && \
    echo "Build completed, checking dist directory..." && \
    ls -la dist/ && \
    echo "Checking for server.js:" && \
    ls -la dist/server.js && \
    echo "Build verification complete"

# Remove source files and dev dependencies to reduce image size
RUN rm -rf src/ tsconfig.json && \
    npm prune --production && \
    npm cache clean --force

# Expose common ports (Render will set PORT env var)
EXPOSE 3001 10000

# Change ownership to non-root user
RUN chown -R nodeuser:nodeuser /app && \
    chmod -R 755 /app/public/uploads

# Switch to non-root user for security
USER nodeuser

# Start the application 
CMD ["node", "dist/server.js"] 
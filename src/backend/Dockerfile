FROM node:20

# Note: Chrome installation removed - using Baileys (no browser dependency)

# Create non-root user with home directory and proper permissions
RUN groupadd -r nodeuser && useradd -r -g nodeuser -m -d /home/nodeuser nodeuser \
    && mkdir -p /home/nodeuser/.local/share/applications \
    && chown -R nodeuser:nodeuser /home/nodeuser

WORKDIR /app

# Set environment variables for Node.js
ENV HOME=/home/nodeuser

# Copy package files from backend directory
COPY src/backend/package*.json ./

# Install dependencies (no browser dependencies needed)
RUN npm ci

# Copy source code and config files from backend directory
COPY src/backend/src/ ./src/
COPY src/backend/tsconfig.json ./

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

# Expose common ports (Render will set PORT env var)
EXPOSE 3001 10000

# Set resource limits for Node.js application
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Change ownership to non-root user
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user for security
USER nodeuser

# Start the application 
CMD ["node", "dist/server.js"] 
FROM node:18

# Skip Puppeteer's Chromium download (use system Chrome instead)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install Google Chrome Stable using best practice method
RUN apt-get update && apt-get install -y curl gnupg \
    && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && google-chrome --version

# Create non-root user for security
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

WORKDIR /app

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files from backend directory
COPY src/backend/package*.json ./

# Install dependencies (no Puppeteer Chrome download)
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

# Set resource limits and memory management for Puppeteer stability
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Change ownership to non-root user
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user for security
USER nodeuser

# Start the application with explicit Node.js and memory optimizations
CMD ["node", "--max-old-space-size=4096", "dist/server.js"] 
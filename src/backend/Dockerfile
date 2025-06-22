FROM node:18-slim

# Install dependencies for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome using direct download method
RUN wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends /tmp/chrome.deb \
    && apt-get install -y -f \
    && rm /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/* \
    && google-chrome --version

WORKDIR /app

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files from backend directory
COPY src/backend/package*.json ./

# Install dependencies and Chrome
RUN npm ci && npx puppeteer browsers install chrome

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

# Start the application with explicit Node.js
CMD ["node", "dist/server.js"] 
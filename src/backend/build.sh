#!/bin/bash

# Clean dist directory
rm -rf dist
mkdir -p dist

# Copy non-TS files
cp -r src/public dist/ 2>/dev/null || true

# Use a simple tsc command with specific files
echo "Building TypeScript files..."
npx tsc --project tsconfig.json --diagnostics

echo "Build complete!"
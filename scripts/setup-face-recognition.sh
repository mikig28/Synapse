#!/bin/bash

# Setup script for WhatsApp Group Monitor with Face Recognition
echo "🚀 Setting up WhatsApp Group Monitor with Face Recognition..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database
MONGODB_URI=mongodb://synapse:synapse123@localhost:27017/synapse?authSource=admin

# Redis
REDIS_URL=redis://localhost:6379

# Face Recognition Service
FACE_RECOGNITION_SERVICE_URL=http://localhost:5001

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# AI Services (add your API keys)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here

# Optional: Voyage AI for cost-efficient embeddings
VOYAGE_API_KEY=your_voyage_key_here
EMBEDDING_PROVIDER=openai
EOF
    echo "✅ Created .env file. Please update it with your API keys."
else
    echo "📝 .env file already exists."
fi

# Build and start services
echo "🐳 Building and starting Docker services..."
docker-compose up -d mongodb redis

echo "⏳ Waiting for MongoDB and Redis to be ready..."
sleep 10

# Build face recognition service
echo "🧠 Building Face Recognition service..."
docker-compose build face-recognition

# Start face recognition service
echo "🚀 Starting Face Recognition service..."
docker-compose up -d face-recognition

# Wait for face recognition service to be healthy
echo "⏳ Waiting for Face Recognition service to be ready..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:5001/health &> /dev/null; then
        echo "✅ Face Recognition service is ready!"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    echo "Waiting... ($counter/$timeout seconds)"
done

if [ $counter -ge $timeout ]; then
    echo "❌ Face Recognition service failed to start within $timeout seconds"
    echo "Check logs with: docker-compose logs face-recognition"
    exit 1
fi

# Test the face recognition service
echo "🧪 Testing Face Recognition service..."
health_response=$(curl -s http://localhost:5001/health)
if echo "$health_response" | grep -q '"status":"healthy"'; then
    echo "✅ Face Recognition service is healthy!"
else
    echo "⚠️ Face Recognition service might have issues. Response: $health_response"
fi

# List registered persons (should be empty initially)
echo "📋 Checking registered persons..."
persons_response=$(curl -s http://localhost:5001/api/face/persons)
if echo "$persons_response" | grep -q '"success":true'; then
    echo "✅ Face Recognition API is working!"
    echo "Registered persons: $(echo "$persons_response" | grep -o '"totalPersons":[0-9]*' | cut -d: -f2)"
else
    echo "⚠️ Face Recognition API might have issues. Response: $persons_response"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Service Status:"
echo "  • MongoDB: http://localhost:27017"
echo "  • Redis: http://localhost:6379" 
echo "  • Face Recognition: http://localhost:5001"
echo ""
echo "🔧 Next steps:"
echo "  1. Update .env file with your API keys"
echo "  2. Start your backend server: npm run dev:backend"
echo "  3. Start your frontend server: npm run dev"
echo "  4. Navigate to WhatsApp Monitor at: http://localhost:5173/whatsapp-monitor"
echo ""
echo "📖 Usage:"
echo "  • View logs: docker-compose logs -f face-recognition"
echo "  • Stop services: docker-compose down"
echo "  • Restart services: docker-compose restart"
echo ""
echo "🆘 If you encounter issues:"
echo "  • Check logs: docker-compose logs"
echo "  • Restart services: docker-compose restart"
echo "  • Full reset: docker-compose down -v && ./scripts/setup-face-recognition.sh"
# WhatsApp Group Monitor with Face Recognition

A powerful feature that monitors WhatsApp groups and automatically filters images based on specific persons you want to track.

## 🎯 **What It Does**

The WhatsApp Group Monitor allows you to:
- **Monitor WhatsApp Groups**: Select specific groups to watch for new images
- **Register Target Persons**: Upload training photos of people you want to track
- **Automatic Face Recognition**: Detects when registered persons appear in group images
- **Smart Filtering**: Only saves and shows images containing your target persons
- **Real-time Processing**: Processes images as they arrive in monitored groups

## 🚀 **Quick Setup**

### 1. Start the Services
```bash
# Run the setup script (recommended)
./scripts/setup-face-recognition.sh

# Or manually start services
docker-compose up -d mongodb redis face-recognition
```

### 2. Environment Variables
Add to your `.env` file:
```bash
# Face Recognition Service
FACE_RECOGNITION_SERVICE_URL=http://localhost:5001

# Database (if using Docker)
MONGODB_URI=mongodb://synapse:synapse123@localhost:27017/synapse?authSource=admin
REDIS_URL=redis://localhost:6379
```

### 3. Start Your Application
```bash
# Start backend
npm run dev:backend

# Start frontend  
npm run dev
```

### 4. Access the Feature
Navigate to: `http://localhost:5173/whatsapp-monitor`

## 📋 **How to Use**

### Step 1: Register Target Persons
1. Go to **WhatsApp Monitor** → **Person Profiles** tab
2. Click **Add Person**
3. Enter person's name and description
4. Upload 3-5 clear photos of the person's face
5. Click **Create Profile**

### Step 2: Set Up Group Monitoring
1. Go to **Group Monitors** tab
2. Click **Add Monitor**
3. Select the WhatsApp group to monitor
4. Choose which persons to detect in that group
5. Configure settings:
   - **Confidence Threshold**: How sure the system should be (default: 70%)
   - **Notify on Match**: Get alerts when persons are detected
   - **Save All Images**: Keep all images or only matches
   - **Auto-reply**: Send automatic responses when persons are detected

### Step 3: View Filtered Images
1. Go to **Filtered Images** tab
2. Browse images where your target persons were detected
3. Filter by person or group
4. Archive or tag images as needed

## 🛠️ **Technical Architecture**

### Services
- **Face Recognition Service**: Python Flask app using `face_recognition` library
- **MongoDB**: Stores person profiles, monitors, and filtered images
- **Redis**: Caches face embeddings for fast matching
- **WAHA Service**: WhatsApp integration for message monitoring

### Key Components
- **PersonProfile Model**: Stores face training data and embeddings
- **GroupMonitor Model**: Manages monitoring settings per group
- **FilteredImage Model**: Stores detected images with match metadata
- **Real-time Processing**: Automatic webhook-based image processing

## 📊 **Features**

### 🧠 **Smart Face Recognition**
- Uses state-of-the-art face recognition algorithms
- Configurable confidence thresholds
- Handles multiple faces per image
- Robust to lighting and angle variations

### 🎛️ **Flexible Configuration**
- Monitor multiple groups simultaneously
- Track multiple persons per group
- Customizable confidence levels
- Optional auto-reply messages

### 📈 **Statistics & Monitoring**
- Track messages processed per group
- Count images analyzed
- Monitor detection success rates
- View processing performance metrics

### 🔔 **Smart Notifications**
- Real-time alerts when target persons are detected
- Configurable notification preferences
- Visual indicators for new matches

## 🔧 **Configuration Options**

### Person Profile Settings
- **Training Images**: 3-10 photos for best results
- **Face Quality**: Clear, well-lit photos work best
- **Multiple Angles**: Include front, side, and angled shots

### Group Monitor Settings
- **Confidence Threshold**: 0.1-1.0 (0.7 recommended)
- **Notification**: Enable/disable match alerts
- **Save All Images**: Keep non-matches too
- **Auto-reply**: Send messages when persons detected

## 🔍 **API Endpoints**

### Person Management
```http
POST   /api/v1/group-monitor/persons
GET    /api/v1/group-monitor/persons
PUT    /api/v1/group-monitor/persons/:id
DELETE /api/v1/group-monitor/persons/:id
```

### Group Monitoring
```http
POST   /api/v1/group-monitor/monitors
GET    /api/v1/group-monitor/monitors
PUT    /api/v1/group-monitor/monitors/:id
DELETE /api/v1/group-monitor/monitors/:id
```

### Filtered Images
```http
GET    /api/v1/group-monitor/filtered-images
PUT    /api/v1/group-monitor/filtered-images/:id/archive
POST   /api/v1/group-monitor/filtered-images/:id/tags
```

## 🐳 **Docker Services**

The setup includes these containerized services:

### MongoDB
- **Purpose**: Primary database for all data
- **Port**: 27017
- **Data**: Person profiles, monitors, filtered images

### Redis  
- **Purpose**: Cache for face embeddings
- **Port**: 6379
- **Data**: Processed face recognition data

### Face Recognition Service
- **Purpose**: AI-powered face detection and matching
- **Port**: 5001
- **Technology**: Python + face_recognition library

## 🚨 **Troubleshooting**

### Common Issues

**Face Recognition Service Won't Start**
```bash
# Check logs
docker-compose logs face-recognition

# Restart service
docker-compose restart face-recognition
```

**Low Detection Accuracy**
- Use higher quality training images
- Upload more photos per person (5-10 recommended)
- Adjust confidence threshold
- Ensure good lighting in training photos

**No Images Being Processed**
- Verify WhatsApp is connected
- Check group monitor is active
- Confirm webhook is receiving data
- Review service logs

### Health Checks
```bash
# Check face recognition service
curl http://localhost:5001/health

# Check registered persons
curl http://localhost:5001/api/face/persons

# View service logs
docker-compose logs -f face-recognition
```

## 🔐 **Privacy & Security**

- **Local Processing**: All face recognition happens on your servers
- **No External APIs**: Faces never leave your infrastructure
- **Encrypted Storage**: Face embeddings stored securely
- **User Isolation**: Each user's data is completely separate

## 📈 **Performance**

### Typical Processing Times
- **Face Detection**: 200-500ms per image
- **Face Matching**: 50-100ms per registered person
- **Total Processing**: Usually under 1 second per image

### Optimization Tips
- Use lower resolution images for faster processing
- Limit number of registered persons per group
- Archive old filtered images periodically
- Monitor Redis memory usage

## 🎉 **Success!**

Your WhatsApp Group Monitor is now ready to intelligently filter images and help you track specific persons across your WhatsApp groups automatically!
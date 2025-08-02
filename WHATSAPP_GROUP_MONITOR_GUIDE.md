# WhatsApp Group Monitor - Complete User Guide

## Overview
The WhatsApp Group Monitor is an AI-powered feature that automatically detects specific people in WhatsApp group images using face recognition technology. When someone you're monitoring appears in a group photo, you'll receive notifications and the images will be saved for review.

## How It Works

### 🎯 Face Recognition Technology
- Uses advanced AI face recognition to identify people in photos
- Analyzes facial features, patterns, and characteristics  
- Compares group images against your trained person profiles
- Provides confidence scores for each detection

## Step-by-Step Setup Guide

### 1. Create Person Profiles 👤

**Purpose**: Train the system to recognize specific people

**Steps**:
1. Navigate to **WhatsApp Monitor** in the sidebar (Camera icon)
2. Click **"Add Person"** button
3. Fill out the form:
   - **Name**: Enter the person's full name (e.g., "John Smith")
   - **Description**: Optional notes about the person (e.g., "CEO", "Friend from college")
4. **Upload Training Images**:
   - Click **"Upload Images"** button
   - Select **3-5 clear photos** of the person's face
   - **Best practices for training images**:
     - Use different angles (front, profile, 3/4 view)
     - Include various lighting conditions
     - Ensure face is clearly visible and unobstructed
     - High resolution images work better
     - Avoid group photos for training
5. Click **"Create Person Profile"**

**Tips**:
- More training images = better accuracy
- Update profiles with new photos periodically
- Test with recent photos of the person

### 2. Set Up Group Monitoring 📱

**Purpose**: Configure which groups to monitor and which people to detect

**Steps**:
1. Click **"Add Monitor"** button
2. **Select WhatsApp Group**:
   - Choose from dropdown list of your WhatsApp groups
   - Groups are automatically synced from your WhatsApp
3. **Choose Target Persons**:
   - Select which person profiles to monitor in this group
   - You can monitor multiple people per group
4. **Configure Settings**:
   - **Notify on Match**: Enable notifications when person is detected
   - **Save All Images**: Keep all group images (not just matches)
   - **Confidence Threshold**: Set detection sensitivity (0.7 = 70% confidence)
     - Higher = fewer false positives, might miss some matches
     - Lower = more detections, might include false positives
   - **Auto Reply**: Automatically respond when person is detected
   - **Reply Message**: Custom message to send (if auto-reply enabled)
5. Click **"Create Monitor"**

### 3. Review Detection Results 🔍

**Purpose**: View and manage detected images

**Navigation**: Click **"Filtered Images"** tab

**What You'll See**:
- **Detected Images**: Photos where your monitored people were found
- **Detection Details**:
  - Person name and confidence score
  - Bounding boxes around detected faces
  - Processing statistics
- **Image Information**:
  - Group name and sender
  - Original caption (if any)
  - Timestamp
  - Detection metadata

**Actions Available**:
- **Archive**: Hide images from main view
- **Review**: Examine detection accuracy
- **Export**: Save images locally

## Understanding the Interface

### Person Profiles Tab
- **View all created profiles**
- **Training image previews** (first 3 images shown)
- **Profile statistics** (total images, status)
- **Quick actions** (edit, delete, toggle active/inactive)

### Group Monitors Tab  
- **List of monitored groups**
- **Target persons** for each group
- **Monitor statistics**:
  - Total messages processed
  - Images analyzed
  - People detected
  - Last activity
- **Settings overview**
- **Quick toggle** to enable/disable monitoring

### Filtered Images Tab
- **Grid view** of detected images
- **Filter options**:
  - By person
  - By group
  - By confidence score
  - By date range
- **Search functionality**
- **Bulk actions** (archive, export)

## Configuration Options

### Confidence Threshold Settings
- **0.9-1.0**: Very strict (few false positives, might miss some matches)
- **0.7-0.8**: Balanced (recommended for most users)
- **0.5-0.6**: Lenient (more detections, higher chance of false positives)
- **Below 0.5**: Not recommended (too many false positives)

### Notification Options
- **Browser notifications** when person is detected
- **Email alerts** (if configured)
- **WhatsApp auto-reply** with custom message
- **Real-time dashboard updates**

## Best Practices

### For Better Accuracy
1. **Quality Training Images**:
   - Use high-resolution photos
   - Ensure good lighting
   - Include multiple angles
   - Update regularly with recent photos

2. **Monitor Settings**:
   - Start with 0.7 confidence threshold
   - Adjust based on results
   - Enable "Save All Images" initially to review accuracy

3. **Regular Maintenance**:
   - Review detected images weekly
   - Archive processed images
   - Update person profiles with new photos
   - Adjust confidence thresholds based on performance

### Privacy and Ethics
- **Only monitor people with their consent**
- **Respect privacy in group settings**
- **Use for legitimate purposes only**
- **Regularly review and clean up stored data**
- **Be transparent about monitoring with group members**

## Troubleshooting

### Common Issues

**Images Not Uploading**:
- Check file format (JPG, PNG supported)
- Ensure file size is under 10MB
- Verify internet connection
- Try refreshing the page

**No Detections Found**:
- Check confidence threshold (try lowering to 0.6)
- Add more training images
- Ensure training images are high quality
- Verify WhatsApp integration is working

**False Positives**:
- Increase confidence threshold to 0.8 or higher
- Review and improve training images
- Remove poor quality training images

**WhatsApp Not Connected**:
- Go to WhatsApp page and scan QR code
- Check WAHA service status
- Verify webhook configuration

### Performance Tips
- **Limit active monitors** to improve processing speed
- **Archive old images** regularly
- **Use specific confidence thresholds** per person if needed
- **Monitor fewer groups** for better performance

## Technical Details

### How Face Recognition Works
1. **Feature Extraction**: AI analyzes facial landmarks and features
2. **Encoding**: Creates unique mathematical representation of each face
3. **Comparison**: Matches new images against stored encodings
4. **Scoring**: Provides confidence score for each potential match
5. **Filtering**: Only shows matches above your threshold

### Data Storage
- **Training images**: Stored securely in GridFS database
- **Detection results**: Metadata stored with image references
- **Person profiles**: Encrypted and user-specific
- **Processing logs**: Temporary, automatically cleaned

### Integration Points
- **WAHA Service**: WhatsApp Web API integration
- **Face Recognition Service**: Python-based AI processing
- **MongoDB**: Secure data storage
- **Real-time Updates**: WebSocket notifications

## Support and Feedback

### Getting Help
- Check this guide first for common solutions
- Review the troubleshooting section
- Contact support for technical issues
- Report bugs through the feedback system

### Providing Feedback
- Rate detection accuracy in the interface
- Report false positives/negatives
- Suggest feature improvements
- Share use case scenarios

---

**Note**: This feature requires WhatsApp to be connected and active. Make sure to scan the QR code in the WhatsApp section before setting up group monitoring.
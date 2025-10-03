# News Article Push Feature

## Overview
Added both **manual** and **automatic** push notification features to the News Hub that allow users to send interesting articles to their Telegram bot or monitored WhatsApp groups.

### Manual Push
Click a button on any article to send it immediately to your selected destination.

### Auto-Push (NEW!)
Configure automatic push - when news is fetched, articles above your relevance threshold will be automatically sent to your Telegram bot or WhatsApp group.

## Features Implemented

### Frontend Components

#### 1. **PushArticleModal Component** (`src/frontend/src/components/NewsHub/PushArticleModal.tsx`)
- Modal dialog for selecting push destination
- Platform selection: Telegram bot or WhatsApp group
- Dynamic loading of available destinations
- Group selection dropdown for WhatsApp
- Article preview in modal
- Loading and error states
- Validation before sending

#### 2. **NewsHubPage Updates** (`src/frontend/src/pages/NewsHubPage.tsx`)
- Added Send button (📤) to each article card
- Modal state management for push feature
- Integration with PushArticleModal component

#### 3. **News Hub Service** (`src/frontend/src/services/newsHubService.ts`)
- `pushToTelegram(articleId)` - Push article to user's Telegram bot
- `pushToWhatsApp(articleId, groupId)` - Push article to specific WhatsApp group

### Backend API

#### 1. **Controller Endpoints** (`src/backend/src/api/controllers/newsHubController.ts`)
- `pushArticleToTelegram` - Sends article to user's configured Telegram bot
- `pushArticleToWhatsApp` - Sends article to specified WhatsApp group
- `formatArticleForMessaging` - Formats article with title, description, date, source, and link

#### 2. **Routes** (`src/backend/src/api/routes/newsHub.ts`)
- `POST /api/v1/news-hub/articles/:id/push/telegram` - Push to Telegram
- `POST /api/v1/news-hub/articles/:id/push/whatsapp` - Push to WhatsApp (requires `groupId` in body)

## Message Format

Articles are formatted with:
- 📰 **Title** (in bold)
- Description
- 📅 Published date
- 📰 Source name
- 🏷️ Category (if available)
- 🔗 Link to full article

## User Flow

1. User browses news articles in News Hub
2. Clicks the Send button (📤) on an interesting article
3. Modal opens showing available push destinations:
   - Telegram bot (if configured)
   - WhatsApp groups (list of monitored groups)
4. User selects destination
5. Clicks "Push Article" button
6. Article is sent to selected platform
7. Success toast notification appears

## Requirements

- **Telegram**: User must have configured their Telegram bot via User Settings
- **WhatsApp**: WhatsApp session must be active and user must have monitored groups

## Technical Details

### Frontend Dependencies
- React state management for modal
- Lucide React icons (Send, MessageCircle, Phone)
- shadcn/ui components (Dialog, Button, RadioGroup, Select)
- Toast notifications for feedback

### Backend Dependencies
- `telegramBotManager` - For sending to user's Telegram bot
- `WAHAService` - For sending to WhatsApp groups
- `RealNewsArticle` model - For fetching article data

### Security
- All endpoints require authentication (`authMiddleware`)
- Articles can only be accessed by the owning user
- User ID validation on all requests
- Telegram bot isolation per user

## Error Handling

- Missing article: 404 error
- No Telegram bot configured: 400 error with helpful message
- Missing WhatsApp group ID: 400 error
- Send failures: 500 error with specific error message
- Frontend validates selections before allowing send

## Auto-Push Configuration

### Backend Model Extensions (`src/backend/src/models/UserInterest.ts`)
Added `autoPush` settings to UserInterest model:
- `enabled` - Toggle auto-push on/off
- `platform` - 'telegram' or 'whatsapp'
- `whatsappGroupId` - ID of WhatsApp group (if platform is WhatsApp)
- `minRelevanceScore` - Only push articles above this score (0-1)

### Auto-Push Logic (`src/backend/src/services/newsPushService.ts`)
NEW dedicated service for auto-pushing articles:
- `autoPushNewArticles()` - Shared function called by both manual and automatic refresh
- Filters articles by relevance score
- Sends each article to configured destination
- Includes 1-second delay between messages to avoid rate limiting
- Non-blocking (won't break refresh if push fails)

**Integration Points:**
- Manual Refresh (`newsHubController.ts`) - Called when user clicks "Refresh" button
- Automatic Refresh (`newsSchedulerService.ts`) - Called when background scheduler fetches news
- **Both paths now support auto-push! ✅**

### Frontend Auto-Push UI (`src/frontend/src/pages/NewsHubPage.tsx`)
New settings section in Interests Modal:
- **Enable/Disable Toggle** - Turn auto-push on/off
- **Platform Selection** - Choose Telegram or WhatsApp
- **Group Selector** - Pick WhatsApp group (if WhatsApp selected)
- **Relevance Slider** - Set minimum score threshold (0-100%)
- **Info Section** - Explains how auto-push works
- **Save Button** - Persist auto-push settings

## Configuration Options

### Min Relevance Score
- Default: 50%
- Range: 0-100%
- Only articles with relevance scores above this threshold will be auto-pushed
- Helps filter for high-quality, relevant content

### Platform-Specific Requirements
**Telegram:**
- Must have configured Telegram bot in User Settings
- Auto-push sends to the user's own chat

**WhatsApp:**
- WhatsApp session must be active
- Must have at least one monitored group
- Select specific group for auto-push

## Future Enhancements

- [x] Auto-push articles when fetched ✅
- [ ] Schedule specific times for auto-push
- [ ] Bulk push multiple selected articles
- [ ] Custom message templates
- [ ] Push to multiple destinations at once
- [ ] Article push history/analytics
- [ ] Share to social media platforms
- [ ] Push digest (combine multiple articles into one message)


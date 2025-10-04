# feat: Add per-group feedback message control for WhatsApp monitoring

## Summary
This PR adds granular control over feedback messages sent to WhatsApp groups when images or voice notes are processed. Users can now enable/disable feedback messages per monitored group, preventing accidental bot responses in sensitive group chats.

## Key Changes

### Backend
- **GroupMonitor Model** (`src/backend/src/models/GroupMonitor.ts`):
  - Added `sendFeedbackMessages` boolean setting (default: `false`)
  - Safe opt-in approach to prevent unwanted messages

- **GroupMonitorService** (`src/backend/src/services/groupMonitorService.ts`):
  - Updated `GroupMonitorSettings` interface with new setting
  - Default value set to `false` for safety

- **WAHAService** (`src/backend/src/services/wahaService.ts`):
  - Image processing: Check `monitor.settings?.sendFeedbackMessages` before sending confirmations
  - Voice processing: Added `shouldSendFeedback` check for all voice-related feedback messages
  - All feedback messages now respect per-group settings and send to correct group (`targetChatId`)

### Frontend
- **WhatsAppGroupMonitorPage** (`src/frontend/src/pages/WhatsAppGroupMonitorPage.tsx`):
  - Added toggle switch in monitor settings card
  - Added toggle in create/edit monitor form
  - Added visual badge indicator when feedback is enabled
  - Clear descriptions explaining the feature

## Features

✅ **Per-group control**: Each monitored group has independent feedback settings  
✅ **Opt-in by default**: Feedback disabled by default to prevent accidents  
✅ **Correct routing**: All messages use `targetChatId` ensuring proper delivery  
✅ **Clear UI**: Toggle with descriptive text explaining functionality  
✅ **Visual feedback**: Badge shows when feedback is enabled  

## User Experience

- **New monitors**: Toggle visible (off by default), can be enabled if desired
- **Existing monitors**: Can toggle on/off anytime in settings
- **Visual indication**: Badge displays when feedback messages are enabled
- **Safe operation**: No accidental messages to unwanted groups

## Testing

- [x] Model schema updated with new field
- [x] Service logic checks setting before sending messages
- [x] Frontend UI displays toggle correctly
- [x] Default value prevents unwanted behavior
- [x] All feedback messages properly gated

## Impact

This change ensures users have full control over which WhatsApp groups receive automated feedback messages, addressing concerns about mistakenly sending bot responses to groups where they're not wanted.

## Note about Images Page

**The Images Page (`src/frontend/src/pages/ImagesPage.tsx`) was NOT modified in this PR.** 

The refresh button and AI image analysis features remain completely intact and functional:
- ✅ "Analyze X Images" button is present (lines 557-576)
- ✅ `handleBulkAnalyze` function working (lines 350-379)
- ✅ `RefreshCw` icon imported (line 28)
- ✅ All AI categorization features active

If you're experiencing issues with the Images Page, they are unrelated to this PR.

---

## Screenshots

### Monitor Settings with New Toggle
The new "Send Feedback Messages" toggle appears in both the monitor card settings and the create/edit form, with clear descriptions of what it does.

### Visual Indicator
When enabled, a "Feedback msgs" badge displays on the monitor card for easy identification.

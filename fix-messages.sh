#!/bin/bash

# Fix the WhatsApp summary controller to retrieve all messages correctly

echo "Fixing WhatsApp summary message retrieval..."

# Backup original file
cp src/backend/src/api/controllers/whatsappSummaryController.ts src/backend/src/api/controllers/whatsappSummaryController.ts.bak

# Fix 1: Remove isIncoming filter (line 353)
sed -i '353s/isIncoming: true,/\/\/ Removed isIncoming filter to get all messages/' src/backend/src/api/controllers/whatsappSummaryController.ts

# Fix 2: Add OR condition for timestamp fields
sed -i '354,357s/createdAt: {/$or: [{ timestamp: { $gte: utcStart, $lte: utcEnd }}, { createdAt: {/' src/backend/src/api/controllers/whatsappSummaryController.ts
sed -i '357s/}/}}]/' src/backend/src/api/controllers/whatsappSummaryController.ts

# Fix 3: Update the query execution to handle more messages
sed -i '385s/sort({ createdAt: 1 })/sort({ timestamp: -1, createdAt: -1 }).limit(1000)/' src/backend/src/api/controllers/whatsappSummaryController.ts

# Fix 4: Fix the message transformation
sed -i '453s/timestamp: msg.timestamp,/timestamp: msg.timestamp || msg.createdAt,/' src/backend/src/api/controllers/whatsappSummaryController.ts

echo "Fixes applied successfully!"

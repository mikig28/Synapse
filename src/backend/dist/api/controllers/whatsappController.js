"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWhatsAppWebhook = void 0;
const handleWhatsAppWebhook = (req, res) => {
    console.log("Received WhatsApp webhook:");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    // WhatsApp webhooks often require a challenge response for verification
    // This depends on the provider (e.g., Twilio, Meta direct)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    // Example for Meta direct API verification
    if (mode && token) {
        // TODO: Configure your own verification token in environment variables
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
            return;
        }
        else {
            console.error('Failed validation. Make sure the tokens match.');
            res.sendStatus(403);
            return;
        }
    }
    // Process actual message payload here (after verification)
    // For now, just acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
};
exports.handleWhatsAppWebhook = handleWhatsAppWebhook;

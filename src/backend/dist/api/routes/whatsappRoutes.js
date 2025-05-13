"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsappController_1 = require("../controllers/whatsappController");
const router = express_1.default.Router();
// Route to handle incoming WhatsApp messages (webhook)
// WhatsApp typically sends GET for verification and POST for messages
router.get('/webhook', whatsappController_1.handleWhatsAppWebhook);
router.post('/webhook', whatsappController_1.handleWhatsAppWebhook);
exports.default = router;

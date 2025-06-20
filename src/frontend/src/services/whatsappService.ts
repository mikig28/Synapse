import { api } from './axiosConfig';

export interface WhatsAppMessage {
  id: string;
  messageId: string;
  from: string;
  to: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  isIncoming: boolean;
  contactId: string;
  
  // Optional fields
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
  caption?: string;
  contextMessageId?: string;
  contextFrom?: string;
}

export interface WhatsAppContact {
  id: string;
  phoneNumber: string;
  name: string;
  avatar?: string;
  lastSeen: Date;
  isOnline: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  
  // Extended fields
  email?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  isBusinessContact: boolean;
  labels?: string[];
  totalMessages: number;
  totalIncomingMessages: number;
  totalOutgoingMessages: number;
  isBlocked: boolean;
  isMuted: boolean;
  tags?: string[];
  notes?: string;
}

export interface WhatsAppStats {
  totalContacts: number;
  totalMessages: number;
  messagesThisWeek: number;
  responseRate: number;
  avgResponseTime: number;
}

export interface WhatsAppConnectionStatus {
  connected: boolean;
  lastHeartbeat: Date;
  webhookConfigured: boolean;
  businessPhoneVerified: boolean;
}

export interface WhatsAppConfig {
  phoneNumber: string;
  webhookUrl: string;
  verifyToken: string;
  autoReply: boolean;
}

class WhatsAppService {
  private baseUrl = '/api/v1/whatsapp';

  // Get all WhatsApp contacts
  async getContacts(): Promise<WhatsAppContact[]> {
    try {
      const response = await api.get(`${this.baseUrl}/contacts`);
      return response.data.data.map((contact: any) => ({
        ...contact,
        id: contact._id,
        lastSeen: new Date(contact.lastSeen),
        lastMessageTimestamp: contact.lastMessageTimestamp ? new Date(contact.lastMessageTimestamp) : undefined
      }));
    } catch (error) {
      console.error('Failed to fetch WhatsApp contacts:', error);
      throw error;
    }
  }

  // Get messages for a specific contact
  async getContactMessages(contactId: string, page = 1, limit = 50): Promise<WhatsAppMessage[]> {
    try {
      const response = await api.get(`${this.baseUrl}/contacts/${contactId}/messages`, {
        params: { page, limit }
      });
      return response.data.data.map((message: any) => ({
        ...message,
        id: message._id,
        timestamp: new Date(message.timestamp)
      }));
    } catch (error) {
      console.error('Failed to fetch contact messages:', error);
      throw error;
    }
  }

  // Send a WhatsApp message
  async sendMessage(to: string, message: string, type: string = 'text'): Promise<WhatsAppMessage> {
    try {
      const response = await api.post(`${this.baseUrl}/send`, {
        to,
        message,
        type
      });
      
      const messageData = response.data.data;
      return {
        ...messageData,
        id: messageData._id,
        timestamp: new Date(messageData.timestamp)
      };
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  // Get WhatsApp statistics
  async getStats(): Promise<WhatsAppStats> {
    try {
      const response = await api.get(`${this.baseUrl}/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch WhatsApp stats:', error);
      throw error;
    }
  }

  // Get connection status
  async getConnectionStatus(): Promise<WhatsAppConnectionStatus> {
    try {
      const response = await api.get(`${this.baseUrl}/status`);
      const data = response.data.data;
      return {
        ...data,
        lastHeartbeat: new Date(data.lastHeartbeat)
      };
    } catch (error) {
      console.error('Failed to fetch WhatsApp connection status:', error);
      throw error;
    }
  }

  // Update WhatsApp configuration
  async updateConfig(config: Partial<WhatsAppConfig>): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/config`, config);
    } catch (error) {
      console.error('Failed to update WhatsApp config:', error);
      throw error;
    }
  }

  // Search contacts
  async searchContacts(query: string): Promise<WhatsAppContact[]> {
    try {
      const contacts = await this.getContacts();
      const lowercaseQuery = query.toLowerCase();
      
      return contacts.filter(contact => 
        contact.name.toLowerCase().includes(lowercaseQuery) ||
        contact.phoneNumber.includes(query) ||
        contact.email?.toLowerCase().includes(lowercaseQuery) ||
        contact.company?.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Failed to search contacts:', error);
      throw error;
    }
  }

  // Mark messages as read for a contact
  async markContactAsRead(contactId: string): Promise<void> {
    try {
      // This would typically be a separate endpoint, but for now we can handle it client-side
      console.log(`Marking contact ${contactId} as read`);
    } catch (error) {
      console.error('Failed to mark contact as read:', error);
      throw error;
    }
  }

  // Block/unblock a contact
  async toggleContactBlock(contactId: string): Promise<void> {
    try {
      // This would be implemented as a separate endpoint
      console.log(`Toggling block status for contact ${contactId}`);
    } catch (error) {
      console.error('Failed to toggle contact block:', error);
      throw error;
    }
  }

  // Mute/unmute a contact
  async toggleContactMute(contactId: string, duration?: number): Promise<void> {
    try {
      // This would be implemented as a separate endpoint
      console.log(`Toggling mute status for contact ${contactId}`, duration ? `for ${duration} minutes` : '');
    } catch (error) {
      console.error('Failed to toggle contact mute:', error);
      throw error;
    }
  }

  // Get message delivery status
  async getMessageStatus(messageId: string): Promise<string> {
    try {
      // This would be implemented to check message delivery status
      return 'delivered';
    } catch (error) {
      console.error('Failed to get message status:', error);
      throw error;
    }
  }

  // Upload media (for sending images, documents, etc.)
  async uploadMedia(file: File): Promise<{ mediaId: string; mediaUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('media', file);
      
      // This would be implemented as a separate endpoint for media upload
      const response = await api.post(`${this.baseUrl}/media/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw error;
    }
  }

  // Send media message
  async sendMediaMessage(
    to: string, 
    mediaId: string, 
    type: 'image' | 'document' | 'audio' | 'video',
    caption?: string
  ): Promise<WhatsAppMessage> {
    try {
      const response = await api.post(`${this.baseUrl}/send`, {
        to,
        type,
        mediaId,
        caption
      });
      
      const messageData = response.data.data;
      return {
        ...messageData,
        id: messageData._id,
        timestamp: new Date(messageData.timestamp)
      };
    } catch (error) {
      console.error('Failed to send media message:', error);
      throw error;
    }
  }

  // Get webhook configuration for setup
  getWebhookConfig(): { webhookUrl: string; verifyToken: string } {
    const baseUrl = window.location.origin;
    return {
      webhookUrl: `${baseUrl}/api/v1/whatsapp/webhook`,
      verifyToken: 'your_verify_token_here' // This should come from configuration
    };
  }

  // Format phone number for display
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Format based on common patterns
    if (cleaned.startsWith('+1') && cleaned.length === 12) {
      // US/Canada format: +1 (XXX) XXX-XXXX
      return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    } else if (cleaned.startsWith('+') && cleaned.length > 10) {
      // International format: +XX XXX XXX XXXX
      const countryCode = cleaned.slice(0, 3);
      const remainder = cleaned.slice(3);
      return `${countryCode} ${remainder.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}`;
    }
    
    return phoneNumber;
  }

  // Format message timestamp for display
  formatMessageTime(timestamp: Date): string {
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return timestamp.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }

  // Get contact avatar URL or generate initials
  getContactAvatar(contact: WhatsAppContact): { type: 'url' | 'initials'; value: string } {
    if (contact.avatar) {
      return { type: 'url', value: contact.avatar };
    }
    
    const initials = contact.name
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
    
    return { type: 'initials', value: initials };
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
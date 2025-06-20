import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import whatsappService, { 
  WhatsAppContact, 
  WhatsAppMessage, 
  WhatsAppStats, 
  WhatsAppConnectionStatus 
} from '@/services/whatsappService';
import { 
  MessageSquare, 
  Phone, 
  Send, 
  Settings,
  Users,
  Bot,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Smartphone,
  Globe,
  Shield,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Plus,
  X,
  Paperclip,
  Smile,
  MoreVertical
} from 'lucide-react';


const WhatsAppPage: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [stats, setStats] = useState<WhatsAppStats>({
    totalMessages: 0,
    totalContacts: 0,
    messagesThisWeek: 0,
    responseRate: 0,
    avgResponseTime: 0
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('chat');

  // Load data from service
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load contacts, stats, and connection status
      const [contactsData, statsData, statusData] = await Promise.all([
        whatsappService.getContacts(),
        whatsappService.getStats(),
        whatsappService.getConnectionStatus()
      ]);

      setContacts(contactsData);
      setStats(statsData);
      setConnectionStatus(statusData);
    } catch (error) {
      console.error('Failed to load WhatsApp data:', error);
      // Set default mock data on error
      setContacts([
        {
          id: '1',
          name: 'Demo Contact',
          phoneNumber: '+1234567890',
          isOnline: false,
          unreadCount: 0,
          lastMessage: 'Welcome to WhatsApp integration!',
          lastSeen: new Date(),
          totalMessages: 1,
          totalIncomingMessages: 0,
          totalOutgoingMessages: 1,
          isBusinessContact: false,
          isBlocked: false,
          isMuted: false
        }
      ]);
      setStats({
        totalMessages: 0,
        totalContacts: 0,
        messagesThisWeek: 0,
        responseRate: 0,
        avgResponseTime: 0
      });
      setConnectionStatus({
        connected: false,
        lastHeartbeat: new Date(),
        webhookConfigured: false,
        businessPhoneVerified: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages when a contact is selected
  useEffect(() => {
    if (selectedContact) {
      loadContactMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const loadContactMessages = async (contactId: string) => {
    try {
      const messagesData = await whatsappService.getContactMessages(contactId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load contact messages:', error);
      setMessages([]);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || isSending) return;

    setIsSending(true);
    
    try {
      const message = await whatsappService.sendMessage(
        selectedContact.phoneNumber,
        newMessage,
        'text'
      );
      
      // Add the sent message to the local state
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Update the contact's unread count (reset to 0 since we sent a message)
      setContacts(prev => prev.map(contact => 
        contact.id === selectedContact.id 
          ? { ...contact, unreadCount: 0, lastMessage: newMessage, lastMessageTimestamp: new Date() }
          : contact
      ));
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // You could show a toast notification here
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === false) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
  };

  const getConnectionStatusText = (connected: boolean | undefined) => {
    if (connected === true) return 'Connected';
    if (connected === false) return 'Disconnected';
    return 'Connecting...';
  };

  const formatTime = (date: Date) => {
    return whatsappService.formatMessageTime(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20">
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">WhatsApp Business</h1>
              <p className="text-muted-foreground">Manage your WhatsApp communications</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-2">
              {getStatusIcon(connectionStatus?.connected)}
              <span>{getConnectionStatusText(connectionStatus?.connected)}</span>
            </Badge>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-bold">{stats.totalMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contacts</p>
                  <p className="text-2xl font-bold">{stats.totalContacts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{stats.responseRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{Math.floor(stats.avgResponseTime / 60)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contacts
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Contacts Sidebar */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Conversations</CardTitle>
                      <Button size="icon" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1 p-3">
                        {filteredContacts.map((contact) => (
                          <motion.div
                            key={contact.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedContact?.id === contact.id 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedContact(contact)}
                          >
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                                {whatsappService.getContactAvatar(contact).value}
                              </div>
                              {contact.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{contact.name}</p>
                                {contact.unreadCount > 0 && (
                                  <Badge className="bg-primary text-primary-foreground text-xs">
                                    {contact.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.lastMessage || contact.phoneNumber}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                  {selectedContact ? (
                    <>
                      <CardHeader className="border-b border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                                {whatsappService.getContactAvatar(selectedContact).value}
                              </div>
                              {selectedContact.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold">{selectedContact.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedContact.isOnline ? 'Online' : `Last seen ${formatTime(selectedContact.lastSeen || new Date())}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost">
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                          <div className="p-4 space-y-4">
                            {messages.map((message) => (
                                <motion.div
                                  key={message.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`flex ${message.isIncoming ? 'justify-start' : 'justify-end'}`}
                                >
                                  <div className={`max-w-[80%] rounded-lg p-3 ${
                                    message.isIncoming 
                                      ? 'bg-muted text-foreground' 
                                      : 'bg-primary text-primary-foreground'
                                  }`}>
                                    <p className="text-sm">{message.message}</p>
                                    <div className="flex items-center justify-between mt-2 gap-2">
                                      <span className="text-xs opacity-70">
                                        {formatTime(message.timestamp)}
                                      </span>
                                      {!message.isIncoming && (
                                        <div className="flex items-center">
                                          {message.status === 'read' && <CheckCircle className="h-3 w-3" />}
                                          {message.status === 'delivered' && <CheckCircle className="h-3 w-3 opacity-50" />}
                                          {message.status === 'sent' && <Clock className="h-3 w-3 opacity-50" />}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            <div ref={messagesEndRef} />
                          </div>
                        </ScrollArea>
                        <div className="border-t border-border/50 p-4">
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost">
                              <Paperclip className="h-4 w-4" />
                            </Button>
                            <Input
                              placeholder="Type a message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                              className="flex-1"
                            />
                            <Button size="icon" variant="ghost">
                              <Smile className="h-4 w-4" />
                            </Button>
                            <Button 
                              onClick={handleSendMessage}
                              disabled={!newMessage.trim() || isSending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto" />
                        <div>
                          <h3 className="text-lg font-semibold">Select a conversation</h3>
                          <p className="text-muted-foreground">Choose a contact to start messaging</p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Contact Management</CardTitle>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search contacts..." className="pl-10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {contacts.map((contact) => (
                        <Card key={contact.id} className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                              {whatsappService.getContactAvatar(contact).value}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{contact.name}</h4>
                              <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={contact.isOnline ? 'default' : 'secondary'} className="text-xs">
                                  {contact.isOnline ? 'Online' : 'Offline'}
                                </Badge>
                                {contact.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {contact.unreadCount} unread
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Message Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Messages This Week</span>
                        <span className="font-semibold">{stats.messagesThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Response Rate</span>
                        <span className="font-semibold text-green-600">{stats.responseRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Avg Response Time</span>
                        <span className="font-semibold">{Math.floor(stats.avgResponseTime / 60)}m {stats.avgResponseTime % 60}s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Connection Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>WhatsApp Status</span>
                        <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                          {connectionStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Webhook URL</span>
                        <Badge variant="outline">Configured</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>API Version</span>
                        <span className="font-semibold">v17.0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      WhatsApp Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Business Phone Number</label>
                      <Input placeholder="+1234567890" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Webhook URL</label>
                      <Input placeholder="https://your-domain.com/api/v1/whatsapp/webhook" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Verify Token</label>
                      <Input type="password" placeholder="Enter verification token" className="mt-1" />
                    </div>
                    <Button className="w-full">Save Configuration</Button>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Automation Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Auto-reply enabled</span>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Business hours</span>
                      <Button variant="outline" size="sm">Set Hours</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Welcome message</span>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Away Message</label>
                      <Textarea 
                        placeholder="Enter your away message..." 
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default WhatsAppPage;
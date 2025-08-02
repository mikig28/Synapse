import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Upload, 
  Send,
  CheckCircle,
  Loader2,
  QrCode,
  FileText,
  Smartphone,
  Globe,
  ArrowRight
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  timeToSetup: string;
  benefits: string[];
  status: 'available' | 'connecting' | 'connected' | 'error';
}

export const ConnectDataStep: React.FC = () => {
  const { 
    integrationStatus, 
    updateIntegrationStatus, 
    completeStep,
    showAchievement 
  } = useOnboardingStore();

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const dataSources: DataSource[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <MessageSquare className="w-6 h-6 text-green-500" />,
      description: 'Capture important messages and media from your WhatsApp conversations',
      difficulty: 'easy',
      timeToSetup: '2 minutes',
      benefits: ['Auto-capture messages', 'Media backup', 'Keyword monitoring'],
      status: integrationStatus.whatsapp.status
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <Send className="w-6 h-6 text-blue-500" />,
      description: 'Connect your Telegram to receive notifications and capture content',
      difficulty: 'easy',
      timeToSetup: '1 minute',
      benefits: ['Real-time notifications', 'Bot commands', 'File sharing'],
      status: integrationStatus.telegram.status
    },
    {
      id: 'documents',
      name: 'Upload Documents',
      icon: <Upload className="w-6 h-6 text-purple-500" />,
      description: 'Upload PDFs, documents, and files to get started immediately',
      difficulty: 'easy',
      timeToSetup: '30 seconds',
      benefits: ['Instant analysis', 'Text extraction', 'Content indexing'],
      status: integrationStatus.documents.uploadedCount > 0 ? 'connected' : 'available'
    }
  ];

  const handleConnectSource = useCallback((sourceId: string) => {
    setSelectedSource(sourceId);
    
    // Update status to connecting
    updateIntegrationStatus(sourceId as any, { status: 'connecting' });

    // Simulate connection process
    if (sourceId === 'whatsapp') {
      setShowQRCode(true);
      // Simulate QR code scan
      setTimeout(() => {
        updateIntegrationStatus('whatsapp', { 
          status: 'connected',
          messagesCount: 0
        });
        setShowQRCode(false);
        showAchievement('🎉 WhatsApp connected successfully!');
        completeStep('connect-data');
      }, 3000);
    } else if (sourceId === 'telegram') {
      // Simulate Telegram connection
      setTimeout(() => {
        updateIntegrationStatus('telegram', { 
          status: 'connected',
          chatId: '@synapse_bot',
          messagesCount: 0
        });
        showAchievement('🎉 Telegram connected successfully!');
        completeStep('connect-data');
      }, 2000);
    } else if (sourceId === 'documents') {
      // Simulate document upload
      setTimeout(() => {
        updateIntegrationStatus('documents', { 
          uploadedCount: 1,
          lastUpload: new Date()
        });
        showAchievement('🎉 Document uploaded successfully!');
        completeStep('connect-data');
      }, 1500);
    }
  }, [updateIntegrationStatus, showAchievement, completeStep]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300';
      case 'advanced': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ArrowRight className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const connectedSources = dataSources.filter(source => source.status === 'connected');
  const hasConnectedSource = connectedSources.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Connect Your First Data Source
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose how you'd like to start feeding information into Synapse. 
          You can always add more sources later.
        </p>
      </motion.div>

      {/* Progress Indicator */}
      {hasConnectedSource && (
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Badge className="bg-green-500/20 text-green-300 px-4 py-2">
            <CheckCircle className="w-4 h-4 mr-2" />
            {connectedSources.length} source{connectedSources.length > 1 ? 's' : ''} connected
          </Badge>
        </motion.div>
      )}

      {/* Data Sources Grid */}
      <motion.div 
        className="grid md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {dataSources.map((source, index) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 * index }}
            whileHover={{ y: -5 }}
          >
            <GlassCard 
              className={`p-6 h-full cursor-pointer transition-all duration-300 ${
                source.status === 'connected' 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : source.status === 'connecting'
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => source.status === 'available' && handleConnectSource(source.id)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/30 rounded-lg">
                    {source.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{source.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(source.difficulty)}>
                        {source.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {source.timeToSetup}
                      </span>
                    </div>
                  </div>
                </div>
                {getStatusIcon(source.status)}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {source.description}
              </p>

              {/* Benefits */}
              <div className="space-y-2 mb-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Benefits
                </span>
                <div className="space-y-1">
                  {source.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1 h-1 bg-primary rounded-full" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Button
                className={`w-full ${
                  source.status === 'connected'
                    ? 'bg-green-600 hover:bg-green-700'
                    : source.status === 'connecting'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : ''
                }`}
                disabled={source.status === 'connecting'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (source.status === 'available') {
                    handleConnectSource(source.id);
                  }
                }}
              >
                {source.status === 'connected' && (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Connected
                  </>
                )}
                {source.status === 'connecting' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                )}
                {source.status === 'available' && (
                  <>
                    Connect {source.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl p-8 max-w-md mx-4"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
            >
              <div className="text-center space-y-6">
                <div className="text-4xl">📱</div>
                <h3 className="text-xl font-semibold text-foreground">
                  Connect WhatsApp
                </h3>
                <p className="text-muted-foreground">
                  Scan this QR code with your WhatsApp to connect
                </p>
                
                {/* Simulated QR Code */}
                <div className="bg-white p-4 rounded-lg mx-auto w-48 h-48 flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-black" />
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for connection...
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Go to Settings → Linked Devices</p>
                  <p>3. Tap "Link a device" and scan this code</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <GlassCard className="p-6 bg-muted/30">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Need Help?</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Don't worry if you're not ready to connect a source right now. 
            You can always do this later from your settings.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Web-based setup
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Detailed guides
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              24/7 support
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
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
      name: 'WhatsApp (Demo)',
      icon: <MessageSquare className="w-6 h-6 text-green-500" />,
      description: 'Demo: Shows how WhatsApp integration would work. In production, this captures messages and media.',
      difficulty: 'easy',
      timeToSetup: '2 minutes',
      benefits: ['Auto-capture messages', 'Media backup', 'Keyword monitoring'],
      status: integrationStatus.whatsapp.status
    },
    {
      id: 'telegram',
      name: 'Telegram (Demo)',
      icon: <Send className="w-6 h-6 text-blue-500" />,
      description: 'Demo: Shows how Telegram bot would work. In production, this provides real-time notifications.',
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
    console.log('handleConnectSource called with:', sourceId);
    setSelectedSource(sourceId);

    try {
      // Handle real connection processes
      if (sourceId === 'whatsapp') {
        console.log('Processing WhatsApp connection...');
        // Update status to connecting for whatsapp
        updateIntegrationStatus('whatsapp', { status: 'connecting' });
        setShowQRCode(true);
        
        // For demo purposes, show instructions but don't auto-complete
        // In production, this would integrate with WhatsApp Web API
        setTimeout(() => {
          setShowQRCode(false);
          updateIntegrationStatus('whatsapp', { status: 'disconnected' });
          alert('WhatsApp integration is not available in demo mode. This would normally connect to WhatsApp Web API.');
        }, 3000);
      } else if (sourceId === 'telegram') {
        console.log('Processing Telegram connection...');
        // Update status to connecting for telegram
        updateIntegrationStatus('telegram', { status: 'connecting' });
        
        // For demo purposes, show instructions but don't auto-complete
        // In production, this would open Telegram bot setup
        setTimeout(() => {
          updateIntegrationStatus('telegram', { status: 'disconnected' });
          alert('Telegram integration is not available in demo mode. This would normally redirect to @synapse_bot setup.');
        }, 2000);
      } else if (sourceId === 'documents') {
        console.log('Processing document upload...');
        // Create a real file input for document upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx,.txt,.md';
        fileInput.multiple = true;
        
        fileInput.onchange = (e) => {
          console.log('Files selected:', (e.target as HTMLInputElement).files);
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            // Update document count - documents doesn't have status field
            updateIntegrationStatus('documents', { 
              uploadedCount: files.length,
              lastUpload: new Date()
            });
            showAchievement(`🎉 ${files.length} document(s) uploaded successfully!`);
            completeStep('connect-data');
          }
        };
        
        fileInput.oncancel = () => {
          console.log('File selection cancelled');
        };
        
        // Immediately trigger file picker
        fileInput.click();
      }
    } catch (error) {
      console.error('Error in handleConnectSource:', error);
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
              onClick={() => {
                console.log('Card clicked for source:', source.id, 'Status:', source.status);
                source.status === 'available' && handleConnectSource(source.id);
              }}
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
                className={`w-full font-medium text-white ${
                  source.status === 'connected'
                    ? 'bg-green-600 hover:bg-green-700'
                    : source.status === 'connecting'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={source.status === 'connecting'}
                onClick={(e) => {
                  console.log('Button clicked for source:', source.id, 'Status:', source.status);
                  e.stopPropagation();
                  if (source.status === 'available') {
                    handleConnectSource(source.id);
                  } else {
                    console.log('Button not clickable, status is:', source.status);
                  }
                }}
              >
                {source.status === 'connected' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Connected
                  </>
                ) : source.status === 'connecting' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
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
                  WhatsApp Integration
                </h3>
                <p className="text-muted-foreground">
                  This is a demo QR code. In production, this would be a real WhatsApp Web connection.
                </p>
                
                {/* Simulated QR Code */}
                <div className="bg-white p-4 rounded-lg mx-auto w-48 h-48 flex items-center justify-center relative">
                  <QrCode className="w-32 h-32 text-black" />
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      DEMO
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Demo mode - connection will timeout
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="font-semibold text-yellow-300">Production Setup:</p>
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Go to Settings → Linked Devices</p>
                  <p>3. Tap "Link a device" and scan the real QR code</p>
                  <p>4. Grant necessary permissions</p>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowQRCode(false);
                    updateIntegrationStatus('whatsapp', { status: 'disconnected' });
                  }}
                  className="mt-4"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {/* Skip Option */}
        {!hasConnectedSource && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              showAchievement('👋 Skipped data source connection - you can set this up later!');
              completeStep('connect-data');
            }}
            className="mb-4"
          >
            Skip for now - I'll connect later
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        
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
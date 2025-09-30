import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  RefreshCw,
  Smartphone,
  Upload,
  Zap,
} from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import documentService from '@/services/documentService';
import whatsappService from '@/services/whatsappService';
import telegramBotService from '@/services/telegramBotService';
import { useToast } from '@/hooks/use-toast';

interface DataSourceCardProps {
  title: string;
  description: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'available';
  actionLabel: string;
  icon: React.ReactNode;
  helper?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  disabled?: boolean;
}

const DataSourceCard: React.FC<DataSourceCardProps> = ({
  title,
  description,
  status,
  actionLabel,
  icon,
  helper,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  disabled,
}) => {
  const statusBadge = useMemo(() => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">Connected</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="border-amber-400/50 text-amber-500">Pending</Badge>;
      case 'available':
        return <Badge variant="secondary">Available</Badge>;
      default:
        return <Badge variant="secondary">Not connected</Badge>;
    }
  }, [status]);

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted/60 p-3 text-foreground/80">{icon}</div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {statusBadge}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onAction} disabled={!onAction || disabled}>
          {actionLabel}
        </Button>
        {secondaryLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction} disabled={disabled}>
            {secondaryLabel}
          </Button>
        )}
      </div>

      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </GlassCard>
  );
};

export const ConnectDataStep: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    integrationStatus,
    updateIntegrationStatus,
    completeStep,
    showAchievement,
    skipStep,
    steps,
  } = useOnboardingStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasDocument = integrationStatus.documents.uploadedCount > 0;
  const hasWhatsApp = integrationStatus.whatsapp.status === 'connected';
  const hasTelegram = integrationStatus.telegram.status === 'connected';

  const markStepComplete = useCallback(() => {
    const step = steps.find((item) => item.id === 'connect-data');
    if (!step?.completed && (hasDocument || hasWhatsApp || hasTelegram)) {
      completeStep('connect-data');
    }
  }, [completeStep, hasDocument, hasTelegram, hasWhatsApp, steps]);

  useEffect(() => {
    markStepComplete();
  }, [markStepComplete]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let uploaded = 0;
      for (const file of Array.from(files)) {
        await documentService.uploadDocument(file, { title: file.name }, (progress) => {
          setUploadProgress(progress);
        });
        uploaded += 1;
      }

      updateIntegrationStatus('documents', {
        uploadedCount: integrationStatus.documents.uploadedCount + uploaded,
        lastUpload: new Date().toISOString(),
      });

      showAchievement(`${uploaded} document${uploaded > 1 ? 's' : ''} uploaded successfully.`);
      toast({
        title: 'Documents uploaded',
        description: 'We will analyse them and add them to your knowledge base.',
      });
    } catch (error: any) {
      console.error('Upload failed', error);
      const message = error?.response?.data?.message || error?.message || 'Upload failed. Try again later.';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const refreshStatuses = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [whStatus, botStatus] = await Promise.all([
        whatsappService.getConnectionStatus().catch(() => null),
        telegramBotService.getBotStatus().catch(() => null),
      ]);

      if (whStatus) {
        updateIntegrationStatus('whatsapp', {
          status: whStatus.connected ? 'connected' : 'disconnected',
          lastSync: whStatus.lastHeartbeat ? new Date(whStatus.lastHeartbeat).toISOString() : null,
          error: null,
        });
      }

      if (botStatus) {
        updateIntegrationStatus('telegram', {
          status: botStatus.hasBot && botStatus.isActive ? 'connected' : botStatus.hasBot ? 'connecting' : 'disconnected',
          botUsername: botStatus.botUsername ?? null,
          error: null,
        });
      }

      toast({ title: 'Statuses refreshed' });
    } catch (error: any) {
      console.error('Refresh failed', error);
      toast({ variant: 'destructive', title: 'Unable to refresh statuses' });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, updateIntegrationStatus]);

  const goToWhatsApp = () => navigate('/whatsapp');
  const goToDocs = () => navigate('/docs');
  const telegramAction = hasTelegram ? () => navigate('/telegram') : () => window.open('https://t.me/BotFather', '_blank');

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx"
        multiple
        className="hidden"
        onChange={(event) => handleFilesSelected(event.target.files)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bring your knowledge into Synapse</h2>
          <p className="text-sm text-muted-foreground">
            Upload documents, connect messaging channels, or continue with the sources you already have.
          </p>
        </div>
        <Button variant="outline" onClick={refreshStatuses} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh statuses
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <DataSourceCard
          title="Upload documents"
          description="Send PDFs, Word files, and text to index instantly."
          status={hasDocument ? 'connected' : 'available'}
          actionLabel={isUploading ? 'Uploadingâ€¦' : 'Select files'}
          icon={<Upload className="h-5 w-5" />}
          helper={
            hasDocument
              ? `${integrationStatus.documents.uploadedCount} document${
                  integrationStatus.documents.uploadedCount > 1 ? 's' : ''
                } uploaded.`
              : 'We support PDF, DOCX, TXT, and Markdown files.'
          }
          onAction={handleUploadClick}
          disabled={isUploading}
        />

        <DataSourceCard
          title="WhatsApp workspace"
          description="Connect WAHA or WhatsApp Business API to sync chats in real-time."
          status={integrationStatus.whatsapp.status || 'disconnected'}
          actionLabel={hasWhatsApp ? 'View WhatsApp inbox' : 'Open WhatsApp setup'}
          icon={<Smartphone className="h-5 w-5" />}
          helper={
            hasWhatsApp
              ? 'We are receiving messages. Visit the WhatsApp page for more controls.'
              : 'A QR or API key is required. We provide step-by-step guidance.'
          }
          onAction={goToWhatsApp}
          secondaryLabel="View guide"
          onSecondaryAction={() => window.open('https://docs.synapse.so/whatsapp-setup', '_blank')}
        />

        <DataSourceCard
          title="Telegram bot"
          description="Use the bot you just connected to capture and monitor channels."
          status={integrationStatus.telegram.status || 'disconnected'}
          actionLabel={hasTelegram ? 'Manage Telegram' : 'Open BotFather'}
          icon={<CloudUpload className="h-5 w-5" />}
          helper={
            hasTelegram
              ? `Bot ${integrationStatus.telegram.botUsername || ''} is active.`
              : 'Create a bot with BotFather and paste the token in the previous step.'
          }
          onAction={telegramAction}
        />
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>
              You can also forward important messages to your bot or email files to <code className="rounded bg-muted px-1">inbox@synapse.so</code>.
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goToDocs}>
              Open documents
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={skipStep} className="text-muted-foreground hover:text-foreground">
              Skip for now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {isUploading && (
          <motion.div
            className="mt-4 flex items-center gap-3 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploadingâ€¦ {uploadProgress}%
          </motion.div>
        )}
      </GlassCard>

      <GlassCard className="p-6 bg-muted/40 border-dashed">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">Need more integrations?</span>
          </div>
          <p>
            Slack, Google Drive, Notion, and more are on our roadmap. Tell us what would help you most and we will reach out when it is ready.
          </p>
          <Button
            variant="outline"
            onClick={() => window.open('https://forms.gle/QGN4J1SynapseFeedback', '_blank')}
            className="w-fit"
          >
            Request an integration
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};



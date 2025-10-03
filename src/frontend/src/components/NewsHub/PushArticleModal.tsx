import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RealNewsArticle } from '@/types/newsHub';
import { newsHubService } from '@/services/newsHubService';
import { telegramBotService } from '@/services/telegramBotService';
import { whatsappService } from '@/services/whatsappService';

interface PushArticleModalProps {
  article: RealNewsArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WhatsAppGroup {
  id: string;
  name: string;
  isGroup: boolean;
}

export const PushArticleModal: React.FC<PushArticleModalProps> = ({
  article,
  open,
  onOpenChange,
}) => {
  const [platform, setPlatform] = useState<'telegram' | 'whatsapp'>('telegram');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [telegramAvailable, setTelegramAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadDestinations();
    }
  }, [open]);

  const loadDestinations = async () => {
    setLoading(true);
    try {
      // Check Telegram availability
      const telegramStatus = await telegramBotService.getBotStatus();
      setTelegramAvailable(telegramStatus.hasBot && telegramStatus.isActive);

      // Load WhatsApp groups
      const groups = await whatsappService.getAvailableGroups();
      setWhatsappGroups(groups.filter(g => g.isGroup));
      
      // Set default selection
      if (telegramStatus.hasBot && telegramStatus.isActive) {
        setPlatform('telegram');
      } else if (groups.length > 0) {
        setPlatform('whatsapp');
        setSelectedGroup(groups[0].id);
      }
    } catch (error) {
      console.error('Error loading destinations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available destinations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!article) return;

    if (platform === 'whatsapp' && !selectedGroup) {
      toast({
        title: 'Error',
        description: 'Please select a WhatsApp group',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      if (platform === 'telegram') {
        await newsHubService.pushToTelegram(article._id);
        toast({
          title: 'Success',
          description: 'Article sent to your Telegram bot',
        });
      } else {
        await newsHubService.pushToWhatsApp(article._id, selectedGroup);
        toast({
          title: 'Success',
          description: 'Article sent to WhatsApp group',
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error pushing article:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send article',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const canSend = () => {
    if (loading || sending) return false;
    if (platform === 'telegram') return telegramAvailable;
    if (platform === 'whatsapp') return whatsappGroups.length > 0 && selectedGroup;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Push Article</DialogTitle>
          <DialogDescription>
            Send this article to your Telegram bot or a WhatsApp group
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Platform</Label>
              <RadioGroup value={platform} onValueChange={(value) => setPlatform(value as 'telegram' | 'whatsapp')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="telegram" id="telegram" disabled={!telegramAvailable} />
                  <Label htmlFor="telegram" className={!telegramAvailable ? 'opacity-50' : ''}>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Telegram Bot
                      {!telegramAvailable && <span className="text-xs text-muted-foreground">(Not configured)</span>}
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="whatsapp" id="whatsapp" disabled={whatsappGroups.length === 0} />
                  <Label htmlFor="whatsapp" className={whatsappGroups.length === 0 ? 'opacity-50' : ''}>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      WhatsApp Group
                      {whatsappGroups.length === 0 && <span className="text-xs text-muted-foreground">(No groups available)</span>}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {platform === 'whatsapp' && whatsappGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Select Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a WhatsApp group" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {article && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm font-medium line-clamp-2">{article.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{article.source.name}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handlePush} disabled={!canSend()} className="gap-2">
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Push Article
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


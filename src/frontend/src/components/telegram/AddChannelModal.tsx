import React, { useState } from 'react';
import { X, Plus, Minus, HelpCircle, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/badge';

interface BotStatus {
  hasBot: boolean;
  isActive: boolean;
  botUsername?: string;
  monitoredChats: number;
}

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { channelIdentifier: string; keywords: string[] }) => Promise<void>;
  botStatus?: BotStatus | null;
}

const AddChannelModal: React.FC<AddChannelModalProps> = ({ isOpen, onClose, onAdd, botStatus }) => {
  const [channelIdentifier, setChannelIdentifier] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddKeyword = () => {
    const trimmedKeyword = keywordInput.trim();
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      setKeywords([...keywords, trimmedKeyword]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(k => k !== keywordToRemove));
  };

  const handleKeywordInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const validateChannelIdentifier = (identifier: string): boolean => {
    const trimmed = identifier.trim();
    
    // Must start with @ for username, or be a negative number for group ID, or positive for channel ID
    if (trimmed.startsWith('@')) {
      return trimmed.length > 1; // @username format
    }
    
    if (trimmed.startsWith('-')) {
      return !isNaN(Number(trimmed)) && trimmed.length > 1; // -1001234567890 format for groups
    }
    
    // Numeric channel ID
    return !isNaN(Number(trimmed)) && trimmed.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!channelIdentifier.trim()) {
      setError('Channel identifier is required');
      return;
    }
    
    if (!validateChannelIdentifier(channelIdentifier)) {
      setError('Invalid channel identifier. Use @channelname, channel ID, or -groupID format');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd({
        channelIdentifier: channelIdentifier.trim(),
        keywords
      });
      
      // Reset form
      setChannelIdentifier('');
      setKeywords([]);
      setKeywordInput('');
      setError('');
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setChannelIdentifier('');
    setKeywords([]);
    setKeywordInput('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden mx-2 sm:mx-4 my-2 sm:my-4">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Add Telegram Channel</DialogTitle>
          <DialogDescription>
            Add a public Telegram channel or group to monitor for new messages.
          </DialogDescription>
        </DialogHeader>

        {/* Bot Status Warning */}
        {!botStatus?.hasBot && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4 flex-shrink-0">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Bot Configuration Required
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You'll need to configure your Telegram bot first before you can add channels. 
                  After filling out this form, you'll be guided through the bot setup process.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col min-h-0 flex-1">
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelIdentifier" className="flex items-center gap-2">
              Channel Identifier
              <HelpCircle className="w-3 h-3 text-muted-foreground" title="Help with channel identifiers" />
            </Label>
            <Input
              id="channelIdentifier"
              placeholder="@channelname, -1001234567890, or channel ID"
              value={channelIdentifier}
              onChange={(e) => setChannelIdentifier(e.target.value)}
              required
            />
            
            {/* Channel Type Examples */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground mb-2">📋 Channel Types & Examples:</h4>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 font-mono text-[10px] min-w-fit">
                    @channel
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Public Channels</div>
                    <div className="text-muted-foreground">@news_channel, @crypto_updates</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-green-700 dark:text-green-300 font-mono text-[10px] min-w-fit">
                    -100123
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Groups & Supergroups</div>
                    <div className="text-muted-foreground">-1001234567890 (negative number)</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-purple-100 dark:bg-purple-900 px-1.5 py-0.5 rounded text-purple-700 dark:text-purple-300 font-mono text-[10px] min-w-fit">
                    123456
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Private Channels</div>
                    <div className="text-muted-foreground">Numeric channel ID (positive number)</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* How to find IDs */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3">
              <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                How to find Channel/Group IDs:
              </h4>
              <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Add your bot to the channel/group first</li>
                <li>Send any message in the channel/group</li>
                <li>Visit: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">https://api.telegram.org/bot&lt;YOUR_BOT_TOKEN&gt;/getUpdates</code></li>
                <li>Look for "chat":{"{"}"id": number{"}"} in the response</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords Filter (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                placeholder="Enter keyword and press Enter"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeywordInputKeyPress}
              />
              <AnimatedButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </AnimatedButton>
            </div>
            
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>🔍 Keyword Tips:</strong> Leave empty to capture all messages, or add keywords like "bitcoin", "news", "update" to filter content. 
                Keywords are case-insensitive and use OR logic (any match saves the message).
              </p>
            </div>
          </div>

          {/* Setup Requirements */}
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2 text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                ⚠️ IMPORTANT: Add Your Bot First!
              </h4>
              <div className="space-y-2 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium">Before adding a channel here, you MUST add your bot to it in Telegram:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li><strong>Channels:</strong> Add @{channelIdentifier.includes('@') ? 'yourbot' : 'SynapseCaptureBot'} as administrator with "Read Messages" permission</li>
                  <li><strong>Groups:</strong> Add @{channelIdentifier.includes('@') ? 'yourbot' : 'SynapseCaptureBot'} as a regular member</li>
                  <li><strong>Private channels:</strong> Add bot as admin, then use the numeric channel ID</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2 text-green-800 dark:text-green-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  ✅ What Works:
                </h4>
                <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                  <li>• Bot added as admin/member ✓</li>
                  <li>• Public channels with @username ✓</li>
                  <li>• Groups with negative IDs ✓</li>
                  <li>• Real-time message updates ✓</li>
                  <li>• Keyword filtering ✓</li>
                </ul>
              </div>
              
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2 text-red-800 dark:text-red-200 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  ❌ Limitations:
                </h4>
                <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                  <li>• No historical messages ✗</li>
                  <li>• Bot must join before monitoring ✗</li>
                  <li>• Private channels need IDs ✗</li>
                  <li>• Some channels may block bots ✗</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 rounded border-l-4 border-blue-400 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>💡 Quick Test:</strong> After adding the channel here, send a test message in the Telegram channel/group. 
                It should appear in Synapse within 2-3 minutes!
              </p>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex gap-2 w-full flex-col sm:flex-row">
            <AnimatedButton
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 w-full sm:w-auto"
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!channelIdentifier.trim()}
              className="flex-1 w-full sm:w-auto"
            >
              Add Channel
            </AnimatedButton>
          </div>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddChannelModal;

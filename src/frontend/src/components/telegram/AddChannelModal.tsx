import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
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

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { channelIdentifier: string; keywords: string[] }) => Promise<void>;
}

const AddChannelModal: React.FC<AddChannelModalProps> = ({ isOpen, onClose, onAdd }) => {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Telegram Channel</DialogTitle>
          <DialogDescription>
            Add a public Telegram channel or group to monitor for new messages.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelIdentifier">Channel Identifier</Label>
            <Input
              id="channelIdentifier"
              placeholder="@channelname or channel ID"
              value={channelIdentifier}
              onChange={(e) => setChannelIdentifier(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Examples: @channelname, -1001234567890 (for groups), or numeric channel ID
            </p>
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
            
            <p className="text-xs text-muted-foreground">
              Only messages containing these keywords will be saved. Leave empty to monitor all messages.
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Important Notes:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Only public channels and groups can be monitored</li>
              <li>• The bot must be added to private groups to monitor them</li>
              <li>• Message fetching happens every 30 minutes automatically</li>
              <li>• Historical messages may not be available due to API limitations</li>
            </ul>
          </div>

          <DialogFooter className="flex gap-2">
            <AnimatedButton
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              loading={isSubmitting}
              disabled={!channelIdentifier.trim()}
            >
              Add Channel
            </AnimatedButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddChannelModal;

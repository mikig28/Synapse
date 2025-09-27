import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';

interface TimeRangeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (timeRange: { startTime: string; endTime: string; preset?: string }) => void;
  title?: string;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Select Time Range"
}) => {
  const [preset, setPreset] = useState<string>('last24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleConfirm = () => {
    let startTime: string;
    let endTime: string;

    if (preset === 'custom') {
      if (!customStart || !customEnd) {
        return; // Validation
      }
      startTime = new Date(customStart).toISOString();
      endTime = new Date(customEnd).toISOString();
    } else {
      const now = new Date();
      endTime = now.toISOString();

      switch (preset) {
        case 'last1h':
          startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
          break;
        case 'last6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
          break;
        case 'last12h':
          startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
          break;
        case 'last24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'last3d':
          startTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'last7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'today':
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          startTime = todayStart.toISOString();
          break;
        case 'yesterday':
          const yesterdayStart = new Date(now);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          yesterdayStart.setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(yesterdayStart);
          yesterdayEnd.setHours(23, 59, 59, 999);
          startTime = yesterdayStart.toISOString();
          endTime = yesterdayEnd.toISOString();
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }
    }

    onConfirm({ startTime, endTime, preset: preset !== 'custom' ? preset : undefined });
    onClose();
  };

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const now = new Date();
  const defaultStart = formatDateTimeLocal(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const defaultEnd = formatDateTimeLocal(now);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="preset">Time Range Preset</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last1h">Last 1 Hour</SelectItem>
                <SelectItem value="last6h">Last 6 Hours</SelectItem>
                <SelectItem value="last12h">Last 12 Hours</SelectItem>
                <SelectItem value="last24h">Last 24 Hours</SelectItem>
                <SelectItem value="last3d">Last 3 Days</SelectItem>
                <SelectItem value="last7d">Last 7 Days</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preset === 'custom' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={customStart || defaultStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={customEnd || defaultEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {preset !== 'custom' && (
            <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Preview:</span>
              </div>
              <div>
                {preset === 'today' && "Today from 00:00 to now"}
                {preset === 'yesterday' && "Yesterday (full day)"}
                {preset === 'last1h' && "Last 1 hour"}
                {preset === 'last6h' && "Last 6 hours"}
                {preset === 'last12h' && "Last 12 hours"}
                {preset === 'last24h' && "Last 24 hours"}
                {preset === 'last3d' && "Last 3 days"}
                {preset === 'last7d' && "Last 7 days"}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={preset === 'custom' && (!customStart || !customEnd)}
          >
            Run Summary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
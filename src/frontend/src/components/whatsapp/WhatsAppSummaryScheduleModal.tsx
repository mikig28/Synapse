import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { COMMON_TIMEZONES } from '@/types/scheduledAgent';
import { GroupInfo } from '@/types/whatsappSummary';
import { format } from 'date-fns';
import { Clock, Users } from 'lucide-react';

export interface SummaryScheduleFormValues {
  id?: string;
  name: string;
  description?: string;
  runAt: string;
  timezone: string;
  includeAIInsights: boolean;
  includeEmojis: boolean;
  includeKeywords: boolean;
  targetGroupIds: string[];
}

interface WhatsAppSummaryScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableGroups: GroupInfo[];
  initialValues?: SummaryScheduleFormValues;
  onSubmit: (values: SummaryScheduleFormValues) => Promise<void>;
  submitting?: boolean;
}

const defaultTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (error) {
    return 'UTC';
  }
};

const defaultFormValues: SummaryScheduleFormValues = {
  name: '',
  description: '',
  runAt: format(new Date(), 'HH:00'),
  timezone: defaultTimezone(),
  includeAIInsights: true,
  includeEmojis: true,
  includeKeywords: true,
  targetGroupIds: []
};

export const WhatsAppSummaryScheduleModal: React.FC<WhatsAppSummaryScheduleModalProps> = ({
  open,
  onOpenChange,
  availableGroups,
  initialValues,
  onSubmit,
  submitting = false
}) => {
  const [formValues, setFormValues] = useState<SummaryScheduleFormValues>(defaultFormValues);

  useEffect(() => {
    if (open) {
      setFormValues(initialValues ? { ...defaultFormValues, ...initialValues } : defaultFormValues);
    }
  }, [open, initialValues]);

  const allSelected = useMemo(() => {
    return (
      formValues.targetGroupIds.length > 0 &&
      formValues.targetGroupIds.length === availableGroups.length
    );
  }, [formValues.targetGroupIds, availableGroups.length]);

  const toggleGroup = (groupId: string) => {
    setFormValues((prev) => {
      const exists = prev.targetGroupIds.includes(groupId);
      return {
        ...prev,
        targetGroupIds: exists
          ? prev.targetGroupIds.filter((id) => id !== groupId)
          : [...prev.targetGroupIds, groupId]
      };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setFormValues((prev) => ({
        ...prev,
        targetGroupIds: availableGroups.map((group) => group.id)
      }));
    } else {
      setFormValues((prev) => ({ ...prev, targetGroupIds: [] }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formValues.targetGroupIds.length === 0) {
      return;
    }
    await onSubmit(formValues);
  };

  const renderTimezoneOptions = () => {
    const knownTimezones = new Set(COMMON_TIMEZONES.map((tz) => tz.value));
    const options = [...COMMON_TIMEZONES];
    if (!knownTimezones.has(formValues.timezone)) {
      options.push({ label: formValues.timezone, value: formValues.timezone });
    }
    return options;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialValues?.id ? 'Edit Daily Summary Schedule' : 'Create Daily Summary Schedule'}
          </DialogTitle>
          <DialogDescription>
            Configure automatic WhatsApp group summaries delivered on your schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={formValues.name}
                placeholder="Morning briefing"
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="schedule-run-at">Summary Time</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="schedule-run-at"
                  type="time"
                  value={formValues.runAt}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, runAt: event.target.value }))
                  }
                  required
                />
                <Clock className="w-4 h-4 text-blue-200" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Timezone</Label>
              <Select
                value={formValues.timezone}
                onValueChange={(value) =>
                  setFormValues((prev) => ({ ...prev, timezone: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {renderTimezoneOptions().map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="schedule-description">Description (optional)</Label>
              <Textarea
                id="schedule-description"
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Daily insights for customer success groups"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-4 bg-white/5">
              <div>
                <Label className="text-white">AI Insights</Label>
                <p className="text-xs text-blue-200/70">
                  Include AI-generated key topics, sentiment, and action items.
                </p>
              </div>
              <Switch
                checked={formValues.includeAIInsights}
                onCheckedChange={(checked) =>
                  setFormValues((prev) => ({ ...prev, includeAIInsights: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-4 bg-white/5">
              <div>
                <Label className="text-white">Highlight Emojis</Label>
                <p className="text-xs text-blue-200/70">Track popular emojis in the summary.</p>
              </div>
              <Switch
                checked={formValues.includeEmojis}
                onCheckedChange={(checked) =>
                  setFormValues((prev) => ({ ...prev, includeEmojis: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-4 bg-white/5">
              <div>
                <Label className="text-white">Highlight Keywords</Label>
                <p className="text-xs text-blue-200/70">Capture top recurring keywords.</p>
              </div>
              <Switch
                checked={formValues.includeKeywords}
                onCheckedChange={(checked) =>
                  setFormValues((prev) => ({ ...prev, includeKeywords: checked }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Users className="w-4 h-4" />
                <span>Select Target Groups</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-200/70">
                <Checkbox
                  id="schedule-select-all"
                  checked={allSelected}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
                <Label htmlFor="schedule-select-all" className="cursor-pointer">
                  Select All
                </Label>
              </div>
            </div>

            <ScrollArea className="max-h-48 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="space-y-2">
                {availableGroups.map((group) => {
                  const checked = formValues.targetGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-black/20 p-3 text-white hover:bg-black/30 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{group.name}</div>
                        <div className="text-xs text-blue-200/70">
                          {group.participantCount ?? 0} participants
                        </div>
                      </div>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                    </label>
                  );
                })}

                {availableGroups.length === 0 && (
                  <p className="text-sm text-blue-200/70">No WhatsApp groups available.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || formValues.targetGroupIds.length === 0}>
              {submitting ? 'Saving…' : initialValues?.id ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

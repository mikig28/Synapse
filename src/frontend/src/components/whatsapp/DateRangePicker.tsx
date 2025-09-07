import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { Calendar, Clock, ChevronDown, Check } from 'lucide-react';
import { DateRange, DatePickerProps } from '@/types/whatsappSummary';
import WhatsAppSummaryService from '@/services/whatsappSummaryService';

const DateRangePicker: React.FC<DatePickerProps> = ({
  selectedRange,
  onChange,
  availableRanges = []
}) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Get predefined ranges
  const predefinedRanges = WhatsAppSummaryService.getPredefinedRanges();
  const allRanges = [...predefinedRanges, ...availableRanges];

  const handleRangeSelect = (range: DateRange) => {
    onChange(range);
    setShowDropdown(false);
    setShowCustomPicker(false);
  };

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      // Set end time to end of day
      end.setHours(23, 59, 59, 999);
      
      if (start <= end) {
        const customRange = WhatsAppSummaryService.createCustomRange(
          start,
          end,
          `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
        );
        onChange(customRange);
        setShowCustomPicker(false);
        setShowDropdown(false);
      }
    }
  };

  const formatRangeLabel = (range: DateRange): string => {
    if (range.type === 'custom') {
      return range.label;
    }
    
    const messageCount = range.messageCount || 0;
    return `${range.label} (${messageCount} messages)`;
  };

  return (
    <div className="relative">
      <Label className="text-white text-sm font-medium mb-2 block">
        <Calendar className="w-4 h-4 inline mr-2" />
        Time Range
      </Label>
      
      {/* Selected Range Display / Dropdown Trigger */}
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        variant="outline"
        className="w-full justify-between border-white/30 text-white hover:bg-white/10 bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>{formatRangeLabel(selectedRange)}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 z-50"
        >
          <GlassCard className="p-2">
            {/* Predefined Ranges */}
            <div className="space-y-1">
              {allRanges.map((range, index) => (
                <Button
                  key={`${range.type}-${index}`}
                  onClick={() => handleRangeSelect(range)}
                  variant="ghost"
                  className={`w-full justify-between text-left hover:bg-white/10 ${
                    selectedRange.type === range.type && selectedRange.label === range.label
                      ? 'bg-violet-500/20 text-violet-200'
                      : 'text-white'
                  }`}
                >
                  <span>{formatRangeLabel(range)}</span>
                  {selectedRange.type === range.type && selectedRange.label === range.label && (
                    <Check className="w-4 h-4 text-violet-400" />
                  )}
                </Button>
              ))}
              
              {/* Custom Range Option */}
              <Button
                onClick={() => setShowCustomPicker(!showCustomPicker)}
                variant="ghost"
                className="w-full justify-start text-left hover:bg-white/10 text-blue-300"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Custom Date Range
              </Button>
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 border-t border-white/20"
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCustomRange}
                      disabled={!customStart || !customEnd}
                      size="sm"
                      className="bg-violet-500 hover:bg-violet-600 text-white flex-1"
                    >
                      Apply Range
                    </Button>
                    <Button
                      onClick={() => setShowCustomPicker(false)}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setShowCustomPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default DateRangePicker;
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  MessageSquare,
  Search,
  Clock,
  User,
  Image as ImageIcon,
  Video,
  FileAudio,
  FileText,
  FileIcon
} from 'lucide-react';
import { MessageData } from '@/types/whatsappSummary';

interface MessagesAccordionProps {
  messages: MessageData[];
  groupName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
}

const MessagesAccordion: React.FC<MessagesAccordionProps> = ({
  messages,
  groupName,
  timeRange
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter messages based on search term
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;

    return messages.filter(message =>
      message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.senderName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  // Group consecutive messages from the same sender
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      sender: string;
      senderPhone: string;
      messages: MessageData[];
      startTime: Date;
      endTime: Date;
    }> = [];

    filteredMessages.forEach(message => {
      const lastGroup = groups[groups.length - 1];

      // Check if we can group with the previous message (same sender, within 5 minutes)
      if (
        lastGroup &&
        lastGroup.senderPhone === message.senderPhone &&
        (message.timestamp.getTime() - lastGroup.endTime.getTime()) < 5 * 60 * 1000
      ) {
        lastGroup.messages.push(message);
        lastGroup.endTime = message.timestamp;
      } else {
        groups.push({
          sender: message.senderName,
          senderPhone: message.senderPhone,
          messages: [message],
          startTime: message.timestamp,
          endTime: message.timestamp
        });
      }
    });

    return groups;
  }, [filteredMessages]);

  const getMessageTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-green-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-blue-400" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-purple-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-orange-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Generate sender colors based on phone number
  const getSenderColor = (senderPhone: string) => {
    const colors = [
      'text-blue-300',
      'text-green-300',
      'text-purple-300',
      'text-yellow-300',
      'text-pink-300',
      'text-indigo-300',
      'text-cyan-300',
      'text-orange-300'
    ];

    const hash = senderPhone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const accordionTitle = `Original Messages (${messages.length} total${filteredMessages.length !== messages.length ? `, ${filteredMessages.length} shown` : ''})`;

  return (
    <GlassCard className="mt-6">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="messages" className="border-b-0">
          <AccordionTrigger className="text-lg font-semibold text-white px-4 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span>{accordionTitle}</span>
              <Badge variant="secondary" className="bg-white/10 text-white/80">
                {formatDate(timeRange.start)} - {formatDate(timeRange.end)}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  placeholder="Search messages or senders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>

            {/* Messages List */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {groupedMessages.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    {searchTerm ? 'No messages found matching your search.' : 'No messages to display.'}
                  </div>
                ) : (
                  groupedMessages.map((group, groupIndex) => (
                    <motion.div
                      key={`${group.senderPhone}-${groupIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.02 }}
                      className="bg-white/5 rounded-lg p-3"
                    >
                      {/* Sender Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-white/60" />
                          <span className={`font-medium ${getSenderColor(group.senderPhone)}`}>
                            {group.sender}
                          </span>
                          <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                            {group.messages.length} msg{group.messages.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-white/50">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(group.startTime)}</span>
                          {group.messages.length > 1 && (
                            <>
                              <span>-</span>
                              <span>{formatTime(group.endTime)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="space-y-1">
                        {group.messages.map((message, messageIndex) => (
                          <div key={message.id || messageIndex} className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-1">
                              {getMessageTypeIcon(message.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white/90 break-words">
                                {message.type !== 'text' && (
                                  <span className="inline-block mr-2 px-2 py-1 text-xs bg-white/10 rounded capitalize">
                                    {message.type}
                                  </span>
                                )}
                                {message.message || (
                                  <em className="text-white/60">
                                    {message.type === 'image' && '📷 Image'}
                                    {message.type === 'video' && '🎥 Video'}
                                    {message.type === 'audio' && '🎵 Audio'}
                                    {message.type === 'document' && '📄 Document'}
                                    {!['image', 'video', 'audio', 'document'].includes(message.type) && 'Media file'}
                                  </em>
                                )}
                              </div>
                              {group.messages.length > 1 && (
                                <div className="text-xs text-white/40 mt-1">
                                  {formatTime(message.timestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Summary Stats */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>
                  {groupedMessages.length} conversation thread{groupedMessages.length !== 1 ? 's' : ''}
                </span>
                <span>
                  {new Set(filteredMessages.map(m => m.senderPhone)).size} participant{new Set(filteredMessages.map(m => m.senderPhone)).size !== 1 ? 's' : ''}
                </span>
                <span>
                  Time span: {Math.round((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60))}h
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </GlassCard>
  );
};

export default MessagesAccordion;
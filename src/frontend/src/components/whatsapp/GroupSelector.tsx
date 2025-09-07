import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Users, 
  Filter, 
  CheckSquare, 
  Square, 
  Loader2,
  MessageSquare,
  TrendingUp,
  Clock,
  RefreshCw
} from 'lucide-react';
import { GroupSelectorProps } from '@/types/whatsappSummary';
import GroupCard from './GroupCard';

const GroupSelector: React.FC<GroupSelectorProps> = ({
  groups,
  onChange,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'activity' | 'members'>('activity');
  const [showSelected, setShowSelected] = useState(false);

  // Filter and sort groups
  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = showSelected ? group.isSelected : true;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return (b.participantCount || 0) - (a.participantCount || 0);
        case 'activity':
        default:
          return (b.messageCount || 0) - (a.messageCount || 0);
      }
    });

  const selectedCount = groups.filter(g => g.isSelected).length;
  const totalGroups = groups.length;

  const handleToggle = (groupId: string) => {
    const updatedGroups = groups.map(group => 
      group.id === groupId 
        ? { ...group, isSelected: !group.isSelected }
        : group
    );
    onChange(updatedGroups);
  };

  const handleSelectAll = () => {
    const allSelected = filteredGroups.every(g => g.isSelected);
    const updatedGroups = groups.map(group => {
      // If filtering, only affect filtered groups
      if (filteredGroups.find(fg => fg.id === group.id)) {
        return { ...group, isSelected: !allSelected };
      }
      return group;
    });
    onChange(updatedGroups);
  };

  const handleClearAll = () => {
    const updatedGroups = groups.map(group => ({ ...group, isSelected: false }));
    onChange(updatedGroups);
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading WhatsApp groups...</p>
            <p className="text-sm text-blue-300/70 mt-1">Please wait while we fetch your groups</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (totalGroups === 0) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Groups Found</h3>
          <p className="text-blue-300/70">
            Make sure WhatsApp is connected and you have access to group chats.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-blue-300" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'activity' | 'members')}
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
            >
              <option value="activity">Sort by Activity</option>
              <option value="name">Sort by Name</option>
              <option value="members">Sort by Members</option>
            </select>

            {/* Filter Toggle */}
            <Button
              onClick={() => setShowSelected(!showSelected)}
              variant="outline"
              size="sm"
              className={`border-white/30 text-white hover:bg-white/10 ${
                showSelected ? 'bg-violet-500/20' : ''
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showSelected ? 'Show All' : 'Selected Only'}
            </Button>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-white">
              <Users className="w-4 h-4 text-blue-400" />
              <span>
                {selectedCount} of {totalGroups} groups selected
              </span>
            </div>
            
            {filteredGroups.length !== totalGroups && (
              <div className="text-sm text-blue-300/70">
                Showing {filteredGroups.length} filtered results
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSelectAll}
              variant="ghost"
              size="sm"
              className="text-violet-300 hover:bg-violet-500/10"
            >
              {filteredGroups.every(g => g.isSelected) ? (
                <CheckSquare className="w-4 h-4 mr-1" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              Select All
            </Button>
            
            {selectedCount > 0 && (
              <Button
                onClick={handleClearAll}
                variant="ghost"
                size="sm"
                className="text-red-300 hover:bg-red-500/10"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Group Grid */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onToggle={handleToggle}
              onGenerateSummary={() => {}} // This will be passed from parent
            />
          ))}
        </div>
      ) : (
        <GlassCard className="p-8">
          <div className="text-center">
            <Search className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-blue-300/70">
              {showSelected 
                ? "No selected groups match your search criteria."
                : "Try adjusting your search terms or filters."
              }
            </p>
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm('')}
                variant="ghost"
                size="sm"
                className="mt-3 text-violet-300 hover:bg-violet-500/10"
              >
                Clear Search
              </Button>
            )}
          </div>
        </GlassCard>
      )}

      {/* Summary Stats */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white mb-1">Selected Groups Summary</h4>
                <div className="flex items-center gap-4 text-sm text-blue-300/70">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {groups
                        .filter(g => g.isSelected)
                        .reduce((sum, g) => sum + (g.messageCount || 0), 0)
                      } total messages
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {groups
                        .filter(g => g.isSelected)
                        .reduce((sum, g) => sum + (g.participantCount || 0), 0)
                      } total members
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-violet-300 font-medium">
                  Ready for Summary Generation
                </div>
                <div className="text-xs text-blue-300/70">
                  {selectedCount} group{selectedCount !== 1 ? 's' : ''} selected
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
};

export default GroupSelector;
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { createSubscription, listRecommendations, listSubscriptions, triggerFetchNow, updateModeration, updateSubscriptionApi, deleteSubscriptionApi, deleteRecommendationVideoApi, bulkDeleteRecommendationsApi } from '@/services/videoRecommendationsService';
import { KeywordSubscription, RecommendationVideo, VideoModerationStatus } from '@/types/youtube';
import { Check, EyeOff, Filter, Globe2, Plus, RefreshCw, Youtube, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type StatusTab = 'all' | 'pending' | 'approved' | 'hidden';

export const YouTubeRecommendations: React.FC = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<KeywordSubscription[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('all');
  const [status, setStatus] = useState<StatusTab>('pending');
  const [q, setQ] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [videos, setVideos] = useState<RecommendationVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [fetching, setFetching] = useState<boolean>(false);

  // New subscription dialog state
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const DEFAULT_AUTO_FETCH_INTERVAL = 1440;
  const [newKeywords, setNewKeywords] = useState<string>('');
  const [newIncludeShorts, setNewIncludeShorts] = useState<boolean>(true);
  const [newFreshness, setNewFreshness] = useState<number>(14);
  const [newMaxFetch, setNewMaxFetch] = useState<number>(20);
  const [newAutoFetchEnabled, setNewAutoFetchEnabled] = useState<boolean>(false);
  const [newAutoFetchInterval, setNewAutoFetchInterval] = useState<number>(DEFAULT_AUTO_FETCH_INTERVAL);
  const [newAutoFetchTimezone, setNewAutoFetchTimezone] = useState<string>('UTC');
  const [newLanguageFilterMode, setNewLanguageFilterMode] = useState<'include' | 'exclude'>('include');
  const [newLanguageFilterLangs, setNewLanguageFilterLangs] = useState<string>('');
  const [newLanguageFilterEnabled, setNewLanguageFilterEnabled] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  // Manage/edit subscription dialog
  const [manageOpen, setManageOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [editKeywords, setEditKeywords] = useState<string>('');
  const [editFreshness, setEditFreshness] = useState<number>(14);
  const [editMaxFetch, setEditMaxFetch] = useState<number>(20);
  const [editIncludeShorts, setEditIncludeShorts] = useState<boolean>(true);
  const [editAutoFetchEnabled, setEditAutoFetchEnabled] = useState<boolean>(false);
  const [editAutoFetchInterval, setEditAutoFetchInterval] = useState<number>(DEFAULT_AUTO_FETCH_INTERVAL);
  const [editAutoFetchTimezone, setEditAutoFetchTimezone] = useState<string>('UTC');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editLanguageFilterMode, setEditLanguageFilterMode] = useState<'include' | 'exclude'>('include');
  const [editLanguageFilterLangs, setEditLanguageFilterLangs] = useState<string>('');
  const [editLanguageFilterEnabled, setEditLanguageFilterEnabled] = useState<boolean>(false);

  const statusParam = useMemo<VideoModerationStatus | undefined>(() => {
    if (status === 'all') return undefined;
    return status;
  }, [status]);

  const loadSubs = async () => {
    try {
      const subs = await listSubscriptions();
      setSubscriptions(subs);
    } catch (e) {
      // ignore
    }
  };

  const loadVideos = async () => {
    try {
      setLoading(true);
      const res = await listRecommendations({
        subscriptionId: selectedSubId === 'all' ? undefined : selectedSubId,
        status: statusParam,
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize,
      });
      setVideos(res.items);
      setTotal(res.total);
    } catch (e) {
      toast({ title: 'Failed to load recommendations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubs();
  }, []);

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubId, statusParam, page, pageSize]);

  const onSearch = async () => {
    setPage(1);
    await loadVideos();
  };

  const onApprove = async (id: string) => {
    try {
      await updateModeration(id, 'approved');
      setVideos((prev) => prev.map((v) => (v._id === id ? { ...v, status: 'approved' } : v)));
    } catch {
      toast({ title: 'Failed to approve', variant: 'destructive' });
    }
  };

  const onHide = async (id: string) => {
    try {
      await updateModeration(id, 'hidden');
      setVideos((prev) => prev.map((v) => (v._id === id ? { ...v, status: 'hidden' } : v)));
    } catch {
      toast({ title: 'Failed to hide', variant: 'destructive' });
    }
  };

  const onDeleteRecommendation = async (id: string) => {
    try {
      await deleteRecommendationVideoApi(id);
      setVideos((prev) => prev.filter((v) => v._id !== id));
      toast({ title: 'Removed from hidden' });
    } catch {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  const onFetchNow = async () => {
    try {
      setFetching(true);
      const res = await triggerFetchNow(selectedSubId === 'all' ? undefined : selectedSubId);
      toast({ title: 'Fetch complete', description: `Upserted ${res.fetched} videos` });
      await loadVideos();
    } catch {
      toast({ title: 'Fetch failed', variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  const resetCreateDialogState = () => {
    setNewKeywords('');
    setNewIncludeShorts(true);
    setNewFreshness(14);
    setNewMaxFetch(20);
    setNewAutoFetchEnabled(false);
    setNewAutoFetchInterval(DEFAULT_AUTO_FETCH_INTERVAL);
    setNewAutoFetchTimezone('UTC');
    setNewLanguageFilterEnabled(false);
    setNewLanguageFilterMode('include');
    setNewLanguageFilterLangs('');
  };

  const resetEditState = () => {
    setEditId('');
    setEditKeywords('');
    setEditFreshness(14);
    setEditMaxFetch(20);
    setEditIncludeShorts(true);
    setEditIsActive(true);
    setEditAutoFetchEnabled(false);
    setEditAutoFetchInterval(DEFAULT_AUTO_FETCH_INTERVAL);
    setEditAutoFetchTimezone('UTC');
    setEditLanguageFilterEnabled(false);
    setEditLanguageFilterMode('include');
    setEditLanguageFilterLangs('');
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return '—';
    }
  };

  const getAutoFetchSummary = (sub: KeywordSubscription) => {
    if (!sub.autoFetchEnabled) return 'Manual fetch only';
    const interval = sub.autoFetchIntervalMinutes ?? DEFAULT_AUTO_FETCH_INTERVAL;
    const nextRun = sub.autoFetchNextRunAt ? new Date(sub.autoFetchNextRunAt) : undefined;
    const intervalHours = (interval / 60).toFixed(interval % 60 === 0 ? 0 : 1);
    const intervalLabel = interval >= 1440
      ? `${(interval / 1440).toFixed(interval % 1440 === 0 ? 0 : 1)}d`
      : interval >= 60
        ? `${intervalHours}h`
        : `${interval}m`;
    const status = sub.autoFetchStatus ? sub.autoFetchStatus : 'idle';
    const nextLabel = nextRun ? `next ${nextRun.toLocaleString()}` : 'next n/a';
    const tz = sub.autoFetchTimezone || 'UTC';
    return `${intervalLabel} • ${status}${status === 'error' && sub.autoFetchLastError ? ` (${sub.autoFetchLastError})` : ''} • ${nextLabel} • ${tz}`;
  };

  const onCreateSub = async () => {
    if (!newKeywords.trim()) {
      toast({ title: 'Keywords required', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const languageFilter = newLanguageFilterEnabled && newLanguageFilterLangs.trim()
        ? {
            mode: newLanguageFilterMode,
            languages: newLanguageFilterLangs.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
          }
        : undefined;

      const payload = {
        keywords: newKeywords.split(',').map((s) => s.trim()).filter(Boolean),
        includeShorts: newIncludeShorts,
        freshnessDays: newFreshness,
        maxPerFetch: newMaxFetch,
        isActive: true,
        autoFetchEnabled: newAutoFetchEnabled,
        autoFetchIntervalMinutes: newAutoFetchInterval,
        autoFetchTimezone: newAutoFetchTimezone,
        languageFilter,
      };
      const created = await createSubscription(payload);
      setSubscriptions((prev) => [created, ...prev]);
      setOpenDialog(false);
      resetCreateDialogState();
      setSelectedSubId(created._id);
      toast({ title: 'Subscription created' });
    } catch {
      toast({ title: 'Failed to create subscription', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center bg-gradient-to-r from-red-600 via-red-500 to-orange-500 dark:from-red-400 dark:via-red-500 dark:to-orange-400 bg-clip-text text-transparent">
          <Youtube className="h-7 w-7 text-red-500 dark:text-red-400 mr-3 flex-shrink-0" /> YouTube Recommendations
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog
            open={openDialog}
            onOpenChange={(val) => {
              setOpenDialog(val);
              if (!val) resetCreateDialogState();
            }}
          >
            <DialogTrigger asChild>
              <AnimatedButton variant="outline" size="sm" className="flex items-center bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                <Plus className="h-4 w-4 mr-1" /> New Subscription
              </AnimatedButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-900 dark:text-white">Keywords (comma-separated)</label>
                  <Input value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} placeholder="ai, machine learning, typescript" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-slate-900 dark:text-white">Freshness days</label>
                    <Input type="number" min={1} max={90} value={newFreshness} onChange={(e) => setNewFreshness(parseInt(e.target.value || '14', 10))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-slate-900 dark:text-white">Max per fetch</label>
                    <Input type="number" min={1} max={50} value={newMaxFetch} onChange={(e) => setNewMaxFetch(parseInt(e.target.value || '20', 10))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input id="includeShorts" type="checkbox" checked={newIncludeShorts} onChange={(e) => setNewIncludeShorts(e.target.checked)} />
                  <label htmlFor="includeShorts" className="text-sm text-slate-900 dark:text-white">Include Shorts</label>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-auto-fetch" className="text-sm">Auto-fetch recommendations</Label>
                  <Switch id="new-auto-fetch" checked={newAutoFetchEnabled} onCheckedChange={setNewAutoFetchEnabled} />
                </div>
                {newAutoFetchEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="new-auto-fetch-interval" className="text-sm">Interval (minutes)</Label>
                      <Input
                        id="new-auto-fetch-interval"
                        type="number"
                        min={15}
                        max={10080}
                        value={newAutoFetchInterval}
                        onChange={(e) => setNewAutoFetchInterval(parseInt(e.target.value || '1440', 10))}
                      />
                    </div>
                    <div className="flex flex-col gap-2 text-xs">
                      <AnimatedButton variant="outline" size="sm" onClick={() => setNewAutoFetchInterval(1440)}>Daily</AnimatedButton>
                      <AnimatedButton variant="outline" size="sm" onClick={() => setNewAutoFetchInterval(720)}>Every 12h</AnimatedButton>
                      <AnimatedButton variant="outline" size="sm" onClick={() => setNewAutoFetchInterval(180)}>Every 3h</AnimatedButton>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-xs">
                      <Globe2 className="w-3 h-3" />
                      <Label htmlFor="new-auto-fetch-timezone" className="text-sm">Timezone</Label>
                      <Input
                        id="new-auto-fetch-timezone"
                        value={newAutoFetchTimezone}
                        onChange={(e) => setNewAutoFetchTimezone(e.target.value || 'UTC')}
                        placeholder="e.g. America/New_York"
                      />
                    </div>
                  </div>
                )}

                {/* Language Filter Section */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-language-filter" className="text-sm">Language Filter</Label>
                  <Switch id="new-language-filter" checked={newLanguageFilterEnabled} onCheckedChange={setNewLanguageFilterEnabled} />
                </div>
                {newLanguageFilterEnabled && (
                  <div className="space-y-2 p-3 border border-purple-300 dark:border-purple-700/30 rounded-md bg-slate-100 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Mode:</Label>
                      <Select value={newLanguageFilterMode} onValueChange={(v: 'include' | 'exclude') => setNewLanguageFilterMode(v)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="include">Include only</SelectItem>
                          <SelectItem value="exclude">Exclude</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="new-lang-codes" className="text-xs">Language codes (comma-separated)</Label>
                      <Input
                        id="new-lang-codes"
                        value={newLanguageFilterLangs}
                        onChange={(e) => setNewLanguageFilterLangs(e.target.value)}
                        placeholder="en, he, es"
                        className="text-xs"
                      />
                      <p className="text-[10px] text-slate-600 dark:text-purple-400/60 mt-1">
                        Use ISO 639-1 codes (e.g., en=English, he=Hebrew, zh=Chinese, ar=Arabic)
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <AnimatedButton onClick={onCreateSub} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </AnimatedButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={manageOpen}
            onOpenChange={(val) => {
              setManageOpen(val);
              if (!val) resetEditState();
            }}
          >
            <DialogTrigger asChild>
              <AnimatedButton variant="outline" size="sm" className="bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 border-slate-300 dark:border-slate-600">Manage Subscriptions</AnimatedButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Subscriptions</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-auto pr-2">
                {subscriptions.length === 0 ? (
                  <div className="text-sm text-slate-700 dark:text-purple-300/80">No subscriptions yet.</div>
                ) : (
                  subscriptions.map((s) => (
                    <div key={s._id} className="p-3 border border-purple-300 dark:border-purple-800/40 rounded-md bg-slate-100 dark:bg-slate-900/40">
                      <div className="text-sm font-medium text-slate-900 dark:text-purple-200 line-clamp-2">{s.keywords.join(', ')}</div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-400/70 mt-1">freshness {s.freshnessDays}d • max {s.maxPerFetch} • {s.includeShorts ? 'shorts:on' : 'shorts:off'} • {s.isActive ? 'active' : 'inactive'}</div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-300/60 mt-1">{getAutoFetchSummary(s)}</div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400/60 mt-1">last run: {formatDateTime(s.autoFetchLastRunAt)} • last fetched: {s.autoFetchLastFetchedCount ?? 0}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <AnimatedButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditId(s._id);
                            setEditKeywords(s.keywords.join(', '));
                            setEditFreshness(s.freshnessDays);
                            setEditMaxFetch(s.maxPerFetch);
                            setEditIncludeShorts(s.includeShorts);
                            setEditAutoFetchEnabled(s.autoFetchEnabled);
                            setEditAutoFetchInterval(s.autoFetchIntervalMinutes ?? DEFAULT_AUTO_FETCH_INTERVAL);
                            setEditAutoFetchTimezone(s.autoFetchTimezone || 'UTC');
                            setEditIsActive(s.isActive);
                            setEditLanguageFilterEnabled(!!s.languageFilter);
                            setEditLanguageFilterMode(s.languageFilter?.mode || 'include');
                            setEditLanguageFilterLangs(s.languageFilter?.languages.join(', ') || '');
                          }}
                        >Edit</AnimatedButton>
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          className="text-red-400"
                          onClick={async () => {
                            try {
                              await deleteSubscriptionApi(s._id);
                              setSubscriptions((prev) => prev.filter((x) => x._id !== s._id));
                              if (selectedSubId === s._id) setSelectedSubId('all');
                              toast({ title: 'Subscription deleted' });
                            } catch {
                              toast({ title: 'Failed to delete', variant: 'destructive' });
                            }
                          }}
                        >Delete</AnimatedButton>
                      </div>
                      {editId === s._id && (
                        <div className="mt-3 space-y-2">
                          <Input value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
                          <div className="flex gap-2">
                            <Input type="number" min={1} max={90} value={editFreshness} onChange={(e) => setEditFreshness(parseInt(e.target.value || '14', 10))} />
                            <Input type="number" min={1} max={50} value={editMaxFetch} onChange={(e) => setEditMaxFetch(parseInt(e.target.value || '20', 10))} />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="text-xs flex items-center gap-1 text-slate-900 dark:text-white"><input type="checkbox" checked={editIncludeShorts} onChange={(e) => setEditIncludeShorts(e.target.checked)} />Include Shorts</label>
                            <label className="text-xs flex items-center gap-1 text-slate-900 dark:text-white"><input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />Active</label>
                          </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`autoFetch-${s._id}`} className="text-xs">Auto-Fetch</Label>
                          <Switch id={`autoFetch-${s._id}`} checked={editAutoFetchEnabled} onCheckedChange={setEditAutoFetchEnabled} />
                        </div>
                        {editAutoFetchEnabled && (
                          <div className="flex items-center gap-2 text-xs">
                            <Label htmlFor={`autoFetchInterval-${s._id}`}>Interval (minutes)</Label>
                            <Input
                              id={`autoFetchInterval-${s._id}`}
                              type="number"
                              min={15}
                              max={10080}
                              value={editAutoFetchInterval}
                              onChange={(e) => setEditAutoFetchInterval(parseInt(e.target.value || String(DEFAULT_AUTO_FETCH_INTERVAL), 10))}
                            />
                            <AnimatedButton
                              size="sm"
                              variant="outline"
                              onClick={() => setEditAutoFetchInterval(DEFAULT_AUTO_FETCH_INTERVAL)}
                            >Daily</AnimatedButton>
                            <AnimatedButton
                              size="sm"
                              variant="outline"
                              onClick={() => setEditAutoFetchInterval(720)}
                            >12h</AnimatedButton>
                            <AnimatedButton
                              size="sm"
                              variant="outline"
                              onClick={() => setEditAutoFetchInterval(180)}
                            >3h</AnimatedButton>
                          </div>
                        )}
                        {editAutoFetchEnabled && (
                          <div className="flex items-center gap-2 text-xs">
                            <Globe2 className="w-3 h-3" />
                            <Label htmlFor={`autoFetchTimezone-${s._id}`}>Timezone</Label>
                            <Input
                              id={`autoFetchTimezone-${s._id}`}
                              value={editAutoFetchTimezone}
                              onChange={(e) => setEditAutoFetchTimezone(e.target.value || 'UTC')}
                              placeholder="e.g. America/New_York"
                            />
                          </div>
                        )}

                        {/* Language Filter in Edit Mode */}
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`langFilter-${s._id}`} className="text-xs">Language Filter</Label>
                          <Switch id={`langFilter-${s._id}`} checked={editLanguageFilterEnabled} onCheckedChange={setEditLanguageFilterEnabled} />
                        </div>
                        {editLanguageFilterEnabled && (
                          <div className="space-y-2 p-2 border border-purple-300 dark:border-purple-700/30 rounded-md bg-slate-100 dark:bg-slate-800/30">
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px]">Mode:</Label>
                              <Select value={editLanguageFilterMode} onValueChange={(v: 'include' | 'exclude') => setEditLanguageFilterMode(v)}>
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="include">Include only</SelectItem>
                                  <SelectItem value="exclude">Exclude</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`langCodes-${s._id}`} className="text-[10px]">Languages (comma-separated)</Label>
                              <Input
                                id={`langCodes-${s._id}`}
                                value={editLanguageFilterLangs}
                                onChange={(e) => setEditLanguageFilterLangs(e.target.value)}
                                placeholder="en, he, es"
                                className="text-xs h-7"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <AnimatedButton
                            size="sm"
                            onClick={async () => {
                              try {
                                setEditing(true);
                                const languageFilter = editLanguageFilterEnabled && editLanguageFilterLangs.trim()
                                  ? {
                                      mode: editLanguageFilterMode,
                                      languages: editLanguageFilterLangs.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                                    }
                                  : null;

                                const payload = {
                                  keywords: editKeywords.split(',').map((x) => x.trim()).filter(Boolean),
                                  freshnessDays: editFreshness,
                                  maxPerFetch: editMaxFetch,
                                  includeShorts: editIncludeShorts,
                                  isActive: editIsActive,
                                  autoFetchEnabled: editAutoFetchEnabled,
                                  autoFetchIntervalMinutes: editAutoFetchInterval,
                                  autoFetchTimezone: editAutoFetchTimezone,
                                  languageFilter,
                                };
                                const updated = await updateSubscriptionApi(s._id, payload);
                                setSubscriptions((prev) => prev.map((x) => (x._id === s._id ? updated : x)));
                                resetEditState();
                                toast({ title: 'Subscription updated' });
                              } catch {
                                toast({ title: 'Failed to update', variant: 'destructive' });
                              } finally {
                                setEditing(false);
                              }
                            }}
                            disabled={editing}
                          >{editing ? 'Saving...' : 'Save'}</AnimatedButton>
                          <AnimatedButton size="sm" variant="ghost" onClick={resetEditState}>Cancel</AnimatedButton>
                          {editAutoFetchEnabled && (
                            <AnimatedButton
                              size="sm"
                              variant="outline"
                              disabled={editing}
                              onClick={async () => {
                                try {
                                  setEditing(true);
                                  const updated = await updateSubscriptionApi(s._id, {
                                    resetAutoFetch: true,
                                  });
                                  setSubscriptions((prev) => prev.map((x) => (x._id === s._id ? updated : x)));
                                  setEditAutoFetchInterval(updated.autoFetchIntervalMinutes ?? DEFAULT_AUTO_FETCH_INTERVAL);
                                  toast({ title: 'Next run reset' });
                                } catch {
                                  toast({ title: 'Failed to reset schedule', variant: 'destructive' });
                                } finally {
                                  setEditing(false);
                                }
                              }}
                            >Reset Next Run</AnimatedButton>
                          )}
                        </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          <AnimatedButton onClick={onFetchNow} disabled={fetching} className="flex items-center bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
            <RefreshCw className="h-4 w-4 mr-1" /> {fetching ? 'Fetching...' : 'Fetch now'}
          </AnimatedButton>
          {status === 'hidden' && (
            <AnimatedButton
              variant="outline"
              onClick={async () => {
                try {
                  const res = await bulkDeleteRecommendationsApi({ status: 'hidden', subscriptionId: selectedSubId === 'all' ? undefined : selectedSubId });
                  setVideos((prev) => prev.filter((v) => v.status !== 'hidden' || (selectedSubId !== 'all' && v.subscriptionId !== selectedSubId)));
                  toast({ title: 'Cleared hidden', description: `${res.deletedCount} removed` });
                } catch {
                  toast({ title: 'Failed to clear hidden', variant: 'destructive' });
                }
              }}
            >Clear Hidden</AnimatedButton>
          )}
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/50">
        <div className="p-4 flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <label className="text-sm text-slate-900 dark:text-white">Subscription</label>
            <Select value={selectedSubId} onValueChange={setSelectedSubId}>
              <SelectTrigger>
                <SelectValue placeholder="All subscriptions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subscriptions</SelectItem>
                {subscriptions.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.keywords.join(', ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm text-slate-900 dark:text-white">Search</label>
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title/description" />
              <AnimatedButton onClick={onSearch} variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-1" /> Apply
              </AnimatedButton>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-900 dark:text-white">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-900 dark:text-white">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="px-4 pb-4">
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusTab)}>
            <TabsList className="bg-slate-100 dark:bg-slate-700/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">All</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">Approved</TabsTrigger>
              <TabsTrigger value="hidden" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">Hidden</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </GlassCard>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <div className="text-sm text-slate-700 dark:text-slate-300">Loading recommendations...</div>
          </div>
        </div>
      ) : videos.length === 0 ? (
        <GlassCard className="border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/50">
          <div className="p-8 text-center">
            <Youtube className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <div className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No recommendations yet</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Create a subscription and click "Fetch now" to get started.</div>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {videos.map((v) => (
            <GlassCard key={v._id} className="overflow-hidden border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/60 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative aspect-[16/9] cursor-pointer" onClick={() => setPlayingVideoId(v.videoId)}>
                {/* thumbnail */}
                {v.thumbnails?.high?.url || v.thumbnails?.default?.url ? (
                  <img src={(v.thumbnails.high || v.thumbnails.default)!.url} className="w-full h-full object-cover" alt={v.title} />
                ) : (
                  <div className="w-full h-full bg-slate-800" />
                )}
                {/* Dismiss (X) icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); onHide(v._id); }}
                  title="Dismiss"
                  className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-semibold line-clamp-2 text-slate-900 dark:text-white leading-tight">{v.title}</CardTitle>
                <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">{v.channelTitle || 'YouTube'}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1">
                  <span>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : ''}</span>
                  {typeof v.relevance === 'number' && (
                    <>
                      <span>•</span>
                      <span>rel {v.relevance.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">{v.description}</div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                <div className="flex items-center justify-between w-full">
                  <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Open on YouTube</a>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                    v.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                    v.status === 'hidden' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {v.status}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full">
                  {v.status !== 'approved' && (
                    <AnimatedButton size="sm" variant="outline" onClick={() => onApprove(v._id)} className="text-xs flex items-center flex-1 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </AnimatedButton>
                  )}
                  {v.status !== 'hidden' && (
                    <AnimatedButton size="sm" variant="outline" onClick={() => onHide(v._id)} className="text-xs flex items-center flex-1 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30">
                      <EyeOff className="h-3 w-3 mr-1" /> Hide
                    </AnimatedButton>
                  )}
                  {v.status === 'hidden' && (
                    <AnimatedButton size="sm" variant="ghost" onClick={() => onDeleteRecommendation(v._id)} className="text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1">
                      Delete
                    </AnimatedButton>
                  )}
                </div>
              </CardFooter>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700/50">
          <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
            Page {page} of {totalPages} • {total.toLocaleString()} total videos
          </div>
          <div className="flex items-center gap-2">
            <AnimatedButton 
              size="sm" 
              variant="outline" 
              disabled={page <= 1} 
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Prev
            </AnimatedButton>
            <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400">{page}</span>
            <AnimatedButton 
              size="sm" 
              variant="outline" 
              disabled={page >= totalPages} 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Next
            </AnimatedButton>
          </div>
        </div>
      )}

      {/* Player Overlay */}
      {playingVideoId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/80 p-3 md:p-4 rounded-lg shadow-2xl relative w-full max-w-3xl aspect-video border border-purple-500/30">
            <AnimatedButton variant="ghost" size="sm" onClick={() => setPlayingVideoId(null)} className="absolute -top-4 -right-4 bg-red-600 hover:bg-red-700 text-white rounded-full h-9 w-9 z-10 shadow-lg">X</AnimatedButton>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder={0}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeRecommendations;



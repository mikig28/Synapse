import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { createSubscription, listRecommendations, listSubscriptions, triggerFetchNow, updateModeration } from '@/services/videoRecommendationsService';
import { KeywordSubscription, RecommendationVideo, VideoModerationStatus } from '@/types/youtube';
import { Check, EyeOff, Filter, Plus, RefreshCw, Youtube, X } from 'lucide-react';

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
  const [newKeywords, setNewKeywords] = useState<string>('');
  const [newIncludeShorts, setNewIncludeShorts] = useState<boolean>(true);
  const [newFreshness, setNewFreshness] = useState<number>(14);
  const [newMaxFetch, setNewMaxFetch] = useState<number>(20);
  const [creating, setCreating] = useState<boolean>(false);

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

  const onCreateSub = async () => {
    if (!newKeywords.trim()) {
      toast({ title: 'Keywords required', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const payload = {
        keywords: newKeywords.split(',').map((s) => s.trim()).filter(Boolean),
        includeShorts: newIncludeShorts,
        freshnessDays: newFreshness,
        maxPerFetch: newMaxFetch,
        isActive: true,
      };
      const created = await createSubscription(payload);
      setSubscriptions((prev) => [created, ...prev]);
      setOpenDialog(false);
      setNewKeywords('');
      setSelectedSubId(created._id);
      toast({ title: 'Subscription created' });
    } catch (e: any) {
      toast({ title: 'Failed to create subscription', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-semibold flex items-center">
          <Youtube className="h-6 w-6 text-red-500 mr-2" /> YouTube Recommendations
        </h2>
        <div className="flex items-center gap-2">
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <AnimatedButton variant="outline" size="sm" className="flex items-center">
                <Plus className="h-4 w-4 mr-1" /> New Subscription
              </AnimatedButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm">Keywords (comma-separated)</label>
                  <Input value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} placeholder="ai, machine learning, typescript" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm">Freshness days</label>
                    <Input type="number" min={1} max={90} value={newFreshness} onChange={(e) => setNewFreshness(parseInt(e.target.value || '14', 10))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm">Max per fetch</label>
                    <Input type="number" min={1} max={50} value={newMaxFetch} onChange={(e) => setNewMaxFetch(parseInt(e.target.value || '20', 10))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input id="includeShorts" type="checkbox" checked={newIncludeShorts} onChange={(e) => setNewIncludeShorts(e.target.checked)} />
                  <label htmlFor="includeShorts" className="text-sm">Include Shorts</label>
                </div>
              </div>
              <DialogFooter>
                <AnimatedButton onClick={onCreateSub} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </AnimatedButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AnimatedButton onClick={onFetchNow} disabled={fetching} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-1" /> {fetching ? 'Fetching...' : 'Fetch now'}
          </AnimatedButton>
        </div>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="p-3 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="text-sm">Subscription</label>
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
            <label className="text-sm">Search</label>
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title/description" />
              <AnimatedButton onClick={onSearch} variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-1" /> Apply
              </AnimatedButton>
            </div>
          </div>
          <div>
            <label className="text-sm">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="px-3 pb-3">
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="hidden">Hidden</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </GlassCard>

      {/* Grid */}
      {loading ? (
        <div className="text-sm text-purple-200">Loading recommendations...</div>
      ) : videos.length === 0 ? (
        <GlassCard>
          <div className="p-6 text-sm text-purple-200">No recommendations yet. Create a subscription and click Fetch now.</div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((v) => (
            <GlassCard key={v._id} className="overflow-hidden">
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
              <CardHeader className="p-3">
                <CardTitle className="text-sm line-clamp-2">{v.title}</CardTitle>
                <div className="text-[11px] text-purple-300/80 line-clamp-1">{v.channelTitle || 'YouTube'}</div>
                <div className="text-[10px] text-purple-400/60 mt-1">{v.publishedAt ? new Date(v.publishedAt).toLocaleString() : ''} {typeof v.relevance === 'number' ? `• rel ${v.relevance.toFixed(2)}` : ''}</div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xs text-purple-100/80 line-clamp-3">{v.description}</div>
              </CardContent>
              <CardFooter className="p-3 pt-0 flex items-center justify-between">
                <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer" className="text-[12px] text-blue-300 hover:underline">Open on YouTube</a>
                <div className="flex items-center gap-2">
                  {v.status !== 'approved' && (
                    <AnimatedButton size="sm" variant="outline" onClick={() => onApprove(v._id)} className="text-xs flex items-center">
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </AnimatedButton>
                  )}
                  {v.status !== 'hidden' && (
                    <AnimatedButton size="sm" variant="outline" onClick={() => onHide(v._id)} className="text-xs flex items-center">
                      <EyeOff className="h-3 w-3 mr-1" /> Hide
                    </AnimatedButton>
                  )}
                </div>
              </CardFooter>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-purple-200/80">Page {page} / {totalPages} • {total} total</div>
        <div className="flex items-center gap-2">
          <AnimatedButton size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</AnimatedButton>
          <AnimatedButton size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</AnimatedButton>
        </div>
      </div>

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



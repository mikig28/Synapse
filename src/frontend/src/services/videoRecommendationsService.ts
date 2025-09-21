import axiosInstance from './axiosConfig';
import { KeywordSubscription, PaginatedRecommendations, VideoModerationStatus } from '../types/youtube';

export async function listSubscriptions(): Promise<KeywordSubscription[]> {
  const res = await axiosInstance.get<KeywordSubscription[]>(`/videos/subscriptions`);
  return res.data;
}

export async function createSubscription(payload: {
  keywords: string[];
  includeShorts?: boolean;
  freshnessDays?: number;
  maxPerFetch?: number;
  isActive?: boolean;
}): Promise<KeywordSubscription> {
  const res = await axiosInstance.post<KeywordSubscription>(`/videos/subscriptions`, payload);
  return res.data;
}

export async function updateSubscriptionApi(id: string, payload: Partial<{
  keywords: string[];
  includeShorts: boolean;
  freshnessDays: number;
  maxPerFetch: number;
  isActive: boolean;
}>): Promise<KeywordSubscription> {
  const res = await axiosInstance.patch<KeywordSubscription>(`/videos/subscriptions/${id}`, payload);
  return res.data;
}

export async function deleteSubscriptionApi(id: string): Promise<{ success: boolean }>{
  const res = await axiosInstance.delete<{ success: boolean }>(`/videos/subscriptions/${id}`);
  return res.data;
}

export async function triggerFetchNow(subscriptionId?: string): Promise<{ success: boolean; fetched: number }>{
  const res = await axiosInstance.post<{ success: boolean; fetched: number }>(`/videos/fetch`, { subscriptionId });
  return res.data;
}

export async function listRecommendations(params: {
  subscriptionId?: string;
  status?: VideoModerationStatus;
  q?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  pageSize?: number;
}): Promise<PaginatedRecommendations> {
  const searchParams = new URLSearchParams();
  searchParams.set('source', 'youtube');
  if (params.subscriptionId) searchParams.set('subscriptionId', params.subscriptionId);
  if (params.status) searchParams.set('status', params.status);
  if (params.q) searchParams.set('q', params.q);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const res = await axiosInstance.get<PaginatedRecommendations>(`/videos?${searchParams.toString()}`);
  return res.data;
}

export async function updateModeration(videoId: string, status: VideoModerationStatus) {
  const res = await axiosInstance.patch(`/videos/${videoId}`, { status });
  return res.data;
}

export async function deleteRecommendationVideoApi(videoId: string): Promise<{ success: boolean }>{
  const res = await axiosInstance.delete<{ success: boolean }>(`/videos/${videoId}/recommendation`);
  return res.data;
}

export async function bulkDeleteRecommendationsApi(params: { status?: 'hidden'|'pending'|'approved'; subscriptionId?: string }) {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.subscriptionId) sp.set('subscriptionId', params.subscriptionId);
  const res = await axiosInstance.delete<{ success: boolean; deletedCount: number }>(`/videos/recommendations?${sp.toString()}`);
  return res.data;
}



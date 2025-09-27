import api from './axiosConfig';
import { ApiResponse } from '@/types/whatsappSummary';
import {
  WhatsAppSummarySchedule,
  CreateWhatsAppSummaryScheduleRequest,
  UpdateWhatsAppSummaryScheduleRequest,
  WhatsAppSummaryScheduleExecution
} from '../../../shared/types/whatsappSummarySchedule';

export const whatsappSummaryScheduleService = {
  async getSchedules(): Promise<WhatsAppSummarySchedule[]> {
    const response = await api.get<ApiResponse<WhatsAppSummarySchedule[]>>('/whatsapp-summary/schedules');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to load schedules');
    }
    return response.data.data;
  },

  async createSchedule(
    request: CreateWhatsAppSummaryScheduleRequest
  ): Promise<WhatsAppSummarySchedule> {
    const response = await api.post<ApiResponse<WhatsAppSummarySchedule>>('/whatsapp-summary/schedules', request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create schedule');
    }
    return response.data.data;
  },

  async updateSchedule(
    id: string,
    request: UpdateWhatsAppSummaryScheduleRequest
  ): Promise<WhatsAppSummarySchedule> {
    const response = await api.put<ApiResponse<WhatsAppSummarySchedule>>(`/whatsapp-summary/schedules/${id}`, request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update schedule');
    }
    return response.data.data;
  },

  async toggleSchedule(id: string): Promise<WhatsAppSummarySchedule> {
    const response = await api.patch<ApiResponse<WhatsAppSummarySchedule>>(`/whatsapp-summary/schedules/${id}/toggle`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to toggle schedule');
    }
    return response.data.data;
  },

  async deleteSchedule(id: string): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/whatsapp-summary/schedules/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete schedule');
    }
  },

  async runNow(id: string): Promise<WhatsAppSummaryScheduleExecution | null> {
    const response = await api.post<ApiResponse<WhatsAppSummaryScheduleExecution>>(`/whatsapp-summary/schedules/${id}/run`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to execute schedule');
    }
    return response.data.data ?? null;
  },

  async runNowWithTimeRange(
    id: string,
    timeRange: { startTime: string; endTime: string }
  ): Promise<WhatsAppSummaryScheduleExecution | null> {
    const response = await api.post<ApiResponse<WhatsAppSummaryScheduleExecution>>(
      `/whatsapp-summary/schedules/${id}/run`,
      timeRange
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to execute schedule with time range');
    }
    return response.data.data ?? null;
  },

  async getHistory(id: string, limit = 10): Promise<WhatsAppSummaryScheduleExecution[]> {
    const response = await api.get<ApiResponse<WhatsAppSummaryScheduleExecution[]>>(
      `/whatsapp-summary/schedules/${id}/history`,
      { params: { limit } }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to load schedule history');
    }
    return response.data.data;
  }
};

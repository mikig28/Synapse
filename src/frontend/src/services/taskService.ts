import axiosInstance from './axiosConfig';

export interface TaskReminderResponse {
  message: string;
}

/**
 * Send a manual task reminder to user's Telegram
 */
export const sendManualTaskReminder = async (): Promise<TaskReminderResponse> => {
  try {
    const response = await axiosInstance.post<TaskReminderResponse>('/tasks/send-reminder');
    return response.data;
  } catch (error) {
    console.error('Error sending manual task reminder:', error);
    throw error;
  }
};

export const taskService = {
  sendManualTaskReminder,
}; 
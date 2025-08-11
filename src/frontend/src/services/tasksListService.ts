import axiosInstance from './axiosConfig';

export interface TaskItem {
  _id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'done' | 'cancelled' | 'review';
  dueDate?: string;
  createdAt: string;
}

class TasksListService {
  private baseUrl = '/tasks';

  async getTasks(limit: number = 5): Promise<TaskItem[]> {
    const response = await axiosInstance.get(this.baseUrl, { params: { limit, page: 1 } });
    const payload: any = response.data;
    const data = payload?.data ?? payload?.tasks ?? payload;
    if (Array.isArray(data)) return data as TaskItem[];
    if (Array.isArray(data?.tasks)) return data.tasks as TaskItem[];
    return [];
  }
}

export const tasksListService = new TasksListService();
export default tasksListService;

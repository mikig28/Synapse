import axiosInstance from './axiosConfig';

export interface IdeaItem {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
}

class IdeasService {
  private baseUrl = '/ideas';

  async getIdeas(limit: number = 5): Promise<IdeaItem[]> {
    const response = await axiosInstance.get(this.baseUrl, { params: { limit, page: 1 } });
    const payload: any = response.data;
    const data = payload?.data ?? payload?.ideas ?? payload;
    if (Array.isArray(data)) return data as IdeaItem[];
    if (Array.isArray(data?.ideas)) return data.ideas as IdeaItem[];
    return [];
  }
}

export const ideasService = new IdeasService();
export default ideasService;

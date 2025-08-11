import axiosInstance from './axiosConfig';

export interface NoteItem {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
}

class NotesService {
  private baseUrl = '/notes';

  async getNotes(limit: number = 5): Promise<NoteItem[]> {
    const response = await axiosInstance.get(this.baseUrl, { params: { limit, page: 1 } });
    const payload: any = response.data;
    const data = payload?.data ?? payload?.notes ?? payload;
    if (Array.isArray(data)) return data as NoteItem[];
    if (Array.isArray(data?.notes)) return data.notes as NoteItem[];
    return [];
  }
}

export const notesService = new NotesService();
export default notesService;

import axios from './axiosConfig'; // Assuming you have an axios instance configured
import { BookmarkItemType } from '../types/bookmark';

const API_URL = '/api/v1/bookmarks';

export const getBookmarks = async (): Promise<BookmarkItemType[]> => {
  try {
    const response = await axios.get<BookmarkItemType[]>(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    // Consider how to handle errors, maybe throw a custom error or return empty array
    throw error;
  }
}; 
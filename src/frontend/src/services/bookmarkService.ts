import axiosInstance from "./axiosConfig";
import { BookmarkItemType } from "../types/bookmark";

export const getBookmarks = async (): Promise<BookmarkItemType[]> => {
  try {
    const response = await axiosInstance.get<BookmarkItemType[]>('/bookmarks');
    return response.data;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    throw error;
  }
};

export const deleteBookmarkService = async (bookmarkId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.delete<{ message: string }>(`/bookmarks/${bookmarkId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting bookmark ${bookmarkId}:`, error);
    throw error;
  }
}; 
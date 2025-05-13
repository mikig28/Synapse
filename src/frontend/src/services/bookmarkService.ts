import axiosInstance from "./axiosConfig";
import { BookmarkItemType } from "../types/bookmark";

const API_BASE_URL = "http://localhost:3001/api/v1"; // Ensure this is consistent

export const getBookmarks = async (): Promise<BookmarkItemType[]> => {
  try {
    const response = await axiosInstance.get<BookmarkItemType[]>(`${API_BASE_URL}/bookmarks`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    throw error;
  }
};

export const deleteBookmarkService = async (bookmarkId: string): Promise<{ message: string }> => {
  try {
    // Corrected to use axiosInstance and API_BASE_URL
    const response = await axiosInstance.delete<{ message: string }>(`${API_BASE_URL}/bookmarks/${bookmarkId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting bookmark ${bookmarkId}:`, error);
    throw error;
  }
}; 
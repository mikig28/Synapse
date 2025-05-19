import axiosInstance from "./axiosConfig";
import axios from 'axios';
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

export const summarizeBookmarkById = async (bookmarkId: string): Promise<BookmarkItemType> => {
  try {
    const response = await axiosInstance.post<{ message: string; bookmark: BookmarkItemType }>(`/bookmarks/${bookmarkId}/summarize`);
    // The backend returns { message: string, bookmark: BookmarkItemType }
    // We only need to return the bookmark data from the service for state update
    return response.data.bookmark;
  } catch (error) {
    console.error(`Error summarizing bookmark ${bookmarkId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
        // Now error is narrowed to AxiosError, and error.response is available
        throw error.response.data; // Throw the actual error data from backend
    }
    // If it's not an Axios error or doesn't have a response, rethrow the original error
    throw error;
  }
}; 
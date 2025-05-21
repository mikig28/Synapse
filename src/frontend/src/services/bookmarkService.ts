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
  } catch (error: any) {
    console.error(`Error summarizing bookmark ${bookmarkId}:`, error);
    // Check for AxiosError properties directly
    if (error && error.isAxiosError && error.response) {
        throw error.response.data; 
    }
    throw error;
  }
};

export interface SummarizeLatestResponse {
  message: string;
  summarizedBookmarks: BookmarkItemType[];
  errors: Array<{ bookmarkId: string; error: string }>;
}

export const summarizeLatestBookmarksService = async (): Promise<SummarizeLatestResponse> => {
  try {
    const response = await axiosInstance.post<SummarizeLatestResponse>('/bookmarks/summarize-latest');
    return response.data;
  } catch (error: any) {
    console.error("Error calling summarize latest bookmarks service:", error);
    // Check for AxiosError properties directly
    if (error && error.isAxiosError && error.response) {
      throw error.response.data; 
    }
    throw error; // Fallback error
  }
}; 
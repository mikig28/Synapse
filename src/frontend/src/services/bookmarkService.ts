import axiosInstance from "./axiosConfig";
import axios from 'axios';
import { BookmarkItemType } from "../types/bookmark";
import { DigestSourceInfo } from "../context/DigestContext";

// Define a type for the paginated response
export interface PaginatedBookmarksResponse {
  data: BookmarkItemType[];
  currentPage: number;
  totalPages: number;
  totalBookmarks: number;
}

export const getBookmarks = async (page: number = 1, limit: number = 10): Promise<PaginatedBookmarksResponse> => {
  try {
    // Pass page and limit as query parameters
    const response = await axiosInstance.get<PaginatedBookmarksResponse>('/bookmarks', {
      params: { page, limit }
    });
    return response.data; // The entire paginated object is returned
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
  comprehensiveSummary?: string;
  digestSourceInfo?: DigestSourceInfo[];
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

export const speakTextWithElevenLabs = async (text: string, voiceId: string, apiKey: string): Promise<Blob> => {
  const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  // A common default voice ID, you might want to make this configurable or fetch available voices
  // const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // Example Voice ID from docs

  try {
    const response = await axios.post<Blob>(
      ELEVENLABS_API_URL,
      {
        text: text,
        model_id: "eleven_multilingual_v2", // Or "eleven_flash_v2.5" for lower latency
        // voice_settings: { // Optional: customize voice settings
        //   stability: 0.5,
        //   similarity_boost: 0.75,
        // },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey, // IMPORTANT: Handle your API key securely
        },
        responseType: 'blob', // To handle the audio file
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error calling ElevenLabs Text-to-Speech API:", error);

    if (error.response) {
      // Handle Blob error response first
      if (error.response.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          console.error("Error data as text (Blob):", errorText);
          throw new Error(`ElevenLabs API Error: Status ${error.response.status} - ${errorText}`);
        } catch (e) {
          console.error("Could not parse Blob error response:", e);
          throw new Error(`ElevenLabs API Error: Status ${error.response.status} - Could not parse Blob error response.`);
        }
      }

      // Handle other types of error.response.data (likely JSON or string)
      let errorMessage = `Status ${error.response.status}`;
      if (error.response.data && typeof error.response.data === 'object') {
        // Attempt to parse known error structures
        const detail = (error.response.data as any).detail;
        if (detail && typeof detail.message === 'string') {
          errorMessage = `${errorMessage} - ${detail.message}`;
        } else if (typeof (error.response.data as any).message === 'string') {
          errorMessage = `${errorMessage} - ${(error.response.data as any).message}`;
        } else {
          // Fallback to stringifying the data
          try {
            errorMessage = `${errorMessage} - ${JSON.stringify(error.response.data)}`;
          } catch (e) {
            errorMessage = `${errorMessage} - (Unparseable error data object)`;
          }
        }
      } else if (typeof error.response.data === 'string') {
        errorMessage = `${errorMessage} - ${error.response.data}`;
      }
      throw new Error(`ElevenLabs API Error: ${errorMessage}`);

    } else if (error.request) {
      console.error("Error request (no response received):", error.request);
      throw new Error("ElevenLabs API Error: No response received from server.");
    } else {
      console.error("Error message (request setup issue):", error.message);
      throw new Error(`ElevenLabs API Error: ${error.message}`);
    }
  }
}; 
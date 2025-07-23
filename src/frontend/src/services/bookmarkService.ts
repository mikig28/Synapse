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

export const getBookmarks = async (
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<PaginatedBookmarksResponse> => {
  try {
    // Pass page and limit as query parameters
    const response = await axiosInstance.get<PaginatedBookmarksResponse>('/bookmarks', {
      params: { page, limit, search }
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
  
  // Validate API key format
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('ElevenLabs API key is required');
  }

  try {
    const response = await axios.post<Blob>(
      ELEVENLABS_API_URL,
      {
        text: text,
        model_id: "eleven_multilingual_v2", // Or "eleven_flash_v2.5" for lower latency
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey.trim(), // Ensure no whitespace
        },
        responseType: 'blob', // To handle the audio file
        timeout: 30000, // 30 second timeout
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error calling ElevenLabs Text-to-Speech API:", error);

    if (error.response) {
      const status = error.response.status;
      
      // Handle specific status codes
      if (status === 401) {
        throw new Error(`ElevenLabs API Error: Invalid API key. Please check your VITE_ELEVENLABS_API_KEY environment variable.`);
      }
      
      if (status === 422) {
        throw new Error(`ElevenLabs API Error: Invalid request parameters. Check voice ID and text content.`);
      }
      
      if (status === 429) {
        throw new Error(`ElevenLabs API Error: Rate limit exceeded. Please try again later.`);
      }

      // Handle Blob error response
      if (error.response.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          console.error("Error data as text (Blob):", errorText);
          
          // Try to parse JSON from the blob text
          try {
            const errorJson = JSON.parse(errorText);
            const message = errorJson.detail?.message || errorJson.message || errorText;
            throw new Error(`ElevenLabs API Error: Status ${status} - ${message}`);
          } catch (parseError) {
            throw new Error(`ElevenLabs API Error: Status ${status} - ${errorText}`);
          }
        } catch (blobError) {
          console.error("Could not parse Blob error response:", blobError);
          throw new Error(`ElevenLabs API Error: Status ${status} - Could not parse error response.`);
        }
      }

      // Handle other types of error.response.data (likely JSON or string)
      let errorMessage = `Status ${status}`;
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
      throw new Error("ElevenLabs API Error: No response received from server. Check your internet connection.");
    } else {
      console.error("Error message (request setup issue):", error.message);
      throw new Error(`ElevenLabs API Error: ${error.message}`);
    }
  }
};

export const speakTextViaBackend = async (text: string): Promise<Blob> => {
  try {
    const response = await axiosInstance.post<Blob>(
      '/tts',
      { text },
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error calling backend TTS endpoint:', error);
    throw error;
  }
}; 
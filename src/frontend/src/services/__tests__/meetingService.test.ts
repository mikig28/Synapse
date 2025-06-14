import meetingService from '../meetingService'; // Adjusted path
import axiosInstance from '../axiosConfig'; // Adjusted path

// Mock axiosInstance
jest.mock('../axiosConfig', () => ({
  __esModule: true, // This is important for ES modules with default exports
  default: {
    post: jest.fn(),
    // Add any other axiosInstance methods that might be called by other service functions if needed.
    // For uploadAudioForTranscription, only 'post' is directly relevant.
  }
}));

// Spy on console.error
let consoleErrorSpy: jest.SpyInstance;

describe('MeetingService - uploadAudioForTranscription', () => {
  const mockMeetingId = 'test-meeting-id';
  // Node.js's File class is not the same as the browser's File API.
  // For testing in Node.js environment, we might need to mock it or use a polyfill.
  // However, Jest's default environment (jsdom) should provide a basic File implementation.
  // If 'File is not defined' error occurs, will need to address jsdom setup or mock File.
  const mockFile = new File(['dummy content'], 'audio.webm', { type: 'audio/webm' });
  
  beforeEach(() => {
    // Reset mocks before each test
    (axiosInstance.post as jest.Mock).mockClear();
    // Spy on console.error and provide a mock implementation to suppress actual console output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error implementation
    consoleErrorSpy.mockRestore();
  });

  it('should call axiosInstance.post with correct parameters and return data on success', async () => {
    const mockResponseData = { 
      message: 'Audio uploaded successfully', 
      meeting: { _id: mockMeetingId, status: 'processing', processingProgress: 10 } 
    };
    (axiosInstance.post as jest.Mock).mockResolvedValueOnce({ data: mockResponseData });

    const result = await meetingService.uploadAudioForTranscription(mockMeetingId, mockFile);

    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      `/meetings/${mockMeetingId}/upload-audio`,
      expect.any(FormData), // Check that it's FormData
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    // Check if FormData contains the file
    const formData = (axiosInstance.post as jest.Mock).mock.calls[0][1] as FormData;
    expect(formData.get('audioFile')).toEqual(mockFile);
    
    expect(result).toEqual(mockResponseData);
  });

  it('should throw error and log console error on API failure', async () => {
    const mockError = new Error('API Error');
    (axiosInstance.post as jest.Mock).mockRejectedValueOnce(mockError);

    await expect(
      meetingService.uploadAudioForTranscription(mockMeetingId, mockFile)
    ).rejects.toThrow(mockError);
    
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `[MeetingService]: Error uploading audio for meeting ${mockMeetingId}:`,
      mockError
    );
  });
});

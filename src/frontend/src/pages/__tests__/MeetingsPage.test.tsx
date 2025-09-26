import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MeetingsPage from '../MeetingsPage'; // Adjust path as necessary
import meetingService from '../../services/meetingService'; // Adjust path

// Mock meetingService
jest.mock('../../services/meetingService', () => ({
  __esModule: true,
  default: {
    getMeetings: jest.fn().mockResolvedValue({ meetings: [], pagination: { total: 0, pages: 1, page: 1, limit: 10 } }),
    getMeetingStats: jest.fn().mockResolvedValue({ totalMeetings: 0, completedMeetings: 0, processingMeetings: 0, failedMeetings: 0, recentMeetings: 0 }),
    uploadAudioForTranscription: jest.fn().mockResolvedValue({ message: 'Uploaded successfully' }),
    pollMeetingStatus: jest.fn(), // Add other methods used by the component
    createMeeting: jest.fn(),
    deleteMeeting: jest.fn(),
    reprocessMeeting: jest.fn(),
    processTranscription: jest.fn(),
    formatMeetingDate: jest.fn(date => new Date(date).toLocaleDateString()),
    getStatusColor: jest.fn(() => 'text-gray-600'),
    getStatusText: jest.fn(status => status),
    getEstimatedReadingTime: jest.fn(() => '1 min read'),
    getPriorityColor: jest.fn(() => 'text-gray-600'),
  },
}));

// Mock MediaRecorder
const mockMediaRecorderInstance = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: jest.fn(),
  onstop: jest.fn(),
  state: 'inactive' as RecordingState,
  stream: { getTracks: () => [{ stop: jest.fn() }] } as unknown as MediaStream,
};

const mockMediaDevices = {
  getUserMedia: jest.fn(),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

Object.defineProperty(global, 'MediaRecorder', {
  value: jest.fn().mockImplementation(() => mockMediaRecorderInstance),
  writable: true,
});

Object.defineProperty(global, 'File', {
  value: jest.fn().mockImplementation((chunks, fileName, options) => ({
    name: fileName,
    type: options?.type,
    size: chunks.reduce((acc: number, chunk: Blob) => acc + chunk.size, 0),
    arrayBuffer: async () => new ArrayBuffer(0), // Mock necessary File methods
    slice: jest.fn(),
    stream: jest.fn(),
    text: async () => ""
  })),
  writable: true,
});


describe.skip('MeetingsPage - Recording Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset MediaRecorder instance state for each test
    mockMediaRecorderInstance.state = 'inactive';
    mockMediaRecorderInstance.start.mockClear();
    mockMediaRecorderInstance.stop.mockClear();
    (global.navigator.mediaDevices.getUserMedia as jest.Mock).mockReset();
    (meetingService.uploadAudioForTranscription as jest.Mock).mockReset();
    (meetingService.getMeetings as jest.Mock).mockResolvedValue({ meetings: [], pagination: { total: 0, pages: 1, page: 1, limit: 10 } });
    (meetingService.getMeetingStats as jest.Mock).mockResolvedValue({ totalMeetings: 0, completedMeetings: 0, processingMeetings: 0, failedMeetings: 0, recentMeetings: 0 });


    // Mock a selected meeting for tests that require it
    // This is a simplified way; in a real app, you might need to simulate selection via UI
    // For these tests, we can assume a meeting is selected if needed by overriding this in specific tests.
    (meetingService.getMeetings as jest.Mock).mockResolvedValue({
        meetings: [{ _id: 'meeting1', title: 'Test Meeting 1', status: 'completed', meetingDate: new Date().toISOString() }],
        pagination: { total: 1, pages: 1, page: 1, limit: 10 }
    });
  });

  const renderPage = () => render(<MeetingsPage />);

  describe.skip('startRecording', () => {
    it('successfully starts recording on microphone access grant', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as MediaStream);
      mockMediaRecorderInstance.state = 'recording'; // Simulate state change

      renderPage();
      // Wait for the "Start Recording" button to appear, ensuring loading is complete
      const startButton = await screen.findByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      });
      expect(global.MediaRecorder).toHaveBeenCalledTimes(1);
      expect(mockMediaRecorderInstance.start).toHaveBeenCalledTimes(1);
      
      // Check UI updates
      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument(); // Initial timer
    });

    it('shows an error message if microphone access is denied', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(new Error('Permission denied'));
      
      renderPage();
      // Wait for the "Start Recording" button to appear
      const startButton = await screen.findByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      });
      expect(screen.getByText(/Failed to start recording. Please check microphone permissions./i)).toBeInTheDocument();
      expect(screen.queryByText('Stop Recording')).not.toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });
  });

  describe.skip('stopRecording', () => {
    // Helper to simulate starting a recording
    const simulateStartRecording = async (page: ReturnType<typeof renderPage>) => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as MediaStream);
      mockMediaRecorderInstance.state = 'recording';
      // Wait for the "Start Recording" button to appear
      const startButton = await screen.findByText('Start Recording');
      fireEvent.click(startButton);
      await waitFor(() => expect(mockMediaRecorderInstance.start).toHaveBeenCalled());
      
      // Simulate some audio data
      // Need to use 'act' if this causes state updates that React needs to process
      act(() => {
        if (mockMediaRecorderInstance.ondataavailable) {
          mockMediaRecorderInstance.ondataavailable({ data: new Blob(['chunk1'], { type: 'audio/webm' }) } as BlobEvent);
        }
      });
    };
    
    // Helper to select a meeting - very simplified
    const selectFirstMeeting = async () => {
        // This simulates selecting the first meeting from the list
        // In a real test, you'd find and click the meeting card.
        // For now, we'll rely on the initial load populating 'selectedMeeting'
        // if the first meeting is auto-selected or handle selection more directly.
        // The current component logic doesn't auto-select, so we need to click it.
        const meetingCards = await screen.findAllByText(/Test Meeting 1/i); // Assuming title is displayed
        if (meetingCards.length > 0) {
            fireEvent.click(meetingCards[0]);
        }
        await waitFor(() => {}); // wait for state update
    };


    it('successfully stops recording and uploads audio if a meeting is selected', async () => {
      (meetingService.uploadAudioForTranscription as jest.Mock).mockResolvedValue({ message: 'Uploaded' });
      const page = renderPage();
      // Wait for meetings to load and allow selection
      await screen.findByText('Test Meeting 1'); 
      await selectFirstMeeting(); // Ensure a meeting is selected

      await simulateStartRecording(page);
      
      // Wait for "Stop Recording" button to appear
      const stopButton = await screen.findByText('Stop Recording');
      fireEvent.click(stopButton);
      
      // Simulate MediaRecorder's onstop event
      act(() => {
        mockMediaRecorderInstance.state = 'inactive';
        if (mockMediaRecorderInstance.onstop) {
          mockMediaRecorderInstance.onstop({} as Event);
        }
      });

      await waitFor(() => {
        expect(mockMediaRecorderInstance.stop).toHaveBeenCalledTimes(1);
      });
      
      await waitFor(() => {
         expect(meetingService.uploadAudioForTranscription).toHaveBeenCalledWith(
           'meeting1', // Expected meeting ID
           expect.objectContaining({ name: 'recording.webm', type: 'audio/webm' }) // Check File properties
         );
      });

      expect(screen.getByText('Start Recording')).toBeInTheDocument();
      // Check if audioChunks are cleared (indirectly, by ensuring no error about empty chunks if we were to record again)
    });

    it('shows error if trying to stop recording when no meeting is selected', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const page = renderPage();
      // Ensure meetings are loaded so the page isn't stuck in full loading
      await screen.findByText('Test Meeting 1'); 
      // Ensure no meeting is selected (selectedMeeting is null by default)

      await simulateStartRecording(page);
      const stopButton = await screen.findByText('Stop Recording');
      fireEvent.click(stopButton);

      act(() => {
        mockMediaRecorderInstance.state = 'inactive';
        if (mockMediaRecorderInstance.onstop) {
          mockMediaRecorderInstance.onstop({} as Event);
        }
      });
      
      await waitFor(() => {
        expect(mockMediaRecorderInstance.stop).toHaveBeenCalledTimes(1);
      });
      
      expect(meetingService.uploadAudioForTranscription).not.toHaveBeenCalled();
      // The error message is "No meeting selected to associate the recording with..."
      await screen.findByText(/No meeting selected to associate the recording with/i);
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });

    it('shows error if audio upload fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (meetingService.uploadAudioForTranscription as jest.Mock).mockRejectedValue(new Error('Upload failed'));
      const page = renderPage();
      await screen.findByText('Test Meeting 1'); 
      await selectFirstMeeting();

      await simulateStartRecording(page);
      const stopButton = await screen.findByText('Stop Recording');
      fireEvent.click(stopButton);

      act(() => {
        mockMediaRecorderInstance.state = 'inactive';
        if (mockMediaRecorderInstance.onstop) {
          mockMediaRecorderInstance.onstop({} as Event);
        }
      });

      await waitFor(() => {
        expect(mockMediaRecorderInstance.stop).toHaveBeenCalledTimes(1);
      });
      
      await waitFor(() => {
        expect(meetingService.uploadAudioForTranscription).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText(/Failed to upload audio for transcription. Please try again./i)).toBeInTheDocument();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });
  });
});

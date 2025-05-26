import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import meetingService, { Meeting, MeetingStats } from '../services/meetingService';
import { 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Settings,
  Trash2,
  RefreshCw,
  Eye,
  Plus
} from 'lucide-react';

const MeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionMethod, setTranscriptionMethod] = useState<'local' | 'api' | 'dedicated'>('api');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form states
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [transcriptionText, setTranscriptionText] = useState('');

  useEffect(() => {
    loadMeetings();
    loadStats();
  }, [currentPage]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await meetingService.getMeetings({
        page: currentPage,
        limit: 10
      });
      setMeetings(response.meetings);
      setTotalPages(response.pagination.pages);
      setError(null);
    } catch (err) {
      setError('Failed to load meetings');
      console.error('Error loading meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await meetingService.getMeetingStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeetingTitle.trim()) return;

    try {
      const newMeeting = await meetingService.createMeeting({
        title: newMeetingTitle,
        description: newMeetingDescription,
        transcriptionMethod,
        meetingDate: new Date().toISOString()
      });

      setMeetings(prev => [newMeeting, ...prev]);
      setShowCreateModal(false);
      setNewMeetingTitle('');
      setNewMeetingDescription('');
      loadStats();
    } catch (err) {
      setError('Failed to create meeting');
      console.error('Error creating meeting:', err);
    }
  };

  const handleProcessTranscription = async () => {
    if (!selectedMeeting || !transcriptionText.trim()) return;

    try {
      await meetingService.processTranscription(selectedMeeting._id, {
        transcription: transcriptionText
      });

      // Start polling for updates
      meetingService.pollMeetingStatus(
        selectedMeeting._id,
        (updatedMeeting) => {
          setMeetings(prev => 
            prev.map(m => m._id === updatedMeeting._id ? updatedMeeting : m)
          );
          if (selectedMeeting._id === updatedMeeting._id) {
            setSelectedMeeting(updatedMeeting);
          }
        }
      ).catch(console.error);

      setShowTranscriptionModal(false);
      setTranscriptionText('');
    } catch (err) {
      setError('Failed to process transcription');
      console.error('Error processing transcription:', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await meetingService.deleteMeeting(meetingId);
      setMeetings(prev => prev.filter(m => m._id !== meetingId));
      if (selectedMeeting?._id === meetingId) {
        setSelectedMeeting(null);
      }
      loadStats();
    } catch (err) {
      setError('Failed to delete meeting');
      console.error('Error deleting meeting:', err);
    }
  };

  const handleReprocessMeeting = async (meetingId: string) => {
    try {
      await meetingService.reprocessMeeting(meetingId);
      
      // Start polling for updates
      meetingService.pollMeetingStatus(
        meetingId,
        (updatedMeeting) => {
          setMeetings(prev => 
            prev.map(m => m._id === updatedMeeting._id ? updatedMeeting : m)
          );
          if (selectedMeeting?._id === updatedMeeting._id) {
            setSelectedMeeting(updatedMeeting);
          }
        }
      ).catch(console.error);
    } catch (err) {
      setError('Failed to reprocess meeting');
      console.error('Error reprocessing meeting:', err);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    // TODO: Implement actual audio recording
  };

  const stopRecording = () => {
    setIsRecording(false);
    // TODO: Implement stopping recording and processing audio
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'recording':
        return <Mic className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Record, transcribe, and analyze your meetings</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Meeting
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalMeetings}</div>
            <div className="text-sm text-gray-600">Total Meetings</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completedMeetings}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.processingMeetings}</div>
            <div className="text-sm text-gray-600">Processing</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failedMeetings}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.recentMeetings}</div>
            <div className="text-sm text-gray-600">This Week</div>
          </Card>
        </div>
      )}

      {/* Recording Controls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Record</h2>
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <Button onClick={startRecording} className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Start Recording
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Stop Recording
              </Button>
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <select 
              value={transcriptionMethod} 
              onChange={(e) => setTranscriptionMethod(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="api">API Transcription</option>
              <option value="local">Local Transcription</option>
              <option value="dedicated">Dedicated Service</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Meetings List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meetings List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Meetings</h2>
          {meetings.map((meeting) => (
            <Card key={meeting._id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1" onClick={() => setSelectedMeeting(meeting)}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(meeting.status)}
                    <h3 className="font-semibold">{meeting.title}</h3>
                  </div>
                  
                  {meeting.description && (
                    <p className="text-gray-600 text-sm mb-2">{meeting.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {meetingService.formatMeetingDate(meeting.meetingDate)}
                    </span>
                    <span className={meetingService.getStatusColor(meeting.status)}>
                      {meetingService.getStatusText(meeting.status)}
                    </span>
                    {meeting.processingProgress !== undefined && meeting.status === 'processing' && (
                      <span>{meeting.processingProgress}%</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  {meeting.status === 'completed' && !meeting.transcription && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setShowTranscriptionModal(true);
                      }}
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
                  )}
                  
                  {meeting.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReprocessMeeting(meeting._id)}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteMeeting(meeting._id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Meeting Details */}
        <div>
          {selectedMeeting ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedMeeting.title}</h2>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedMeeting.status)}
                  <span className={meetingService.getStatusColor(selectedMeeting.status)}>
                    {meetingService.getStatusText(selectedMeeting.status)}
                  </span>
                </div>
              </div>

              {selectedMeeting.description && (
                <p className="text-gray-600 mb-4">{selectedMeeting.description}</p>
              )}

              <div className="space-y-4">
                {selectedMeeting.transcription && (
                  <div>
                    <h3 className="font-semibold mb-2">Transcription</h3>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-sm">{selectedMeeting.transcription}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {meetingService.getEstimatedReadingTime(selectedMeeting.transcription)}
                    </p>
                  </div>
                )}

                {selectedMeeting.summary && (
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-gray-700">{selectedMeeting.summary}</p>
                  </div>
                )}

                {selectedMeeting.keyHighlights && selectedMeeting.keyHighlights.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Key Highlights</h3>
                    <ul className="space-y-1">
                      {selectedMeeting.keyHighlights.map((highlight, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMeeting.extractedTasks && selectedMeeting.extractedTasks.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Extracted Tasks</h3>
                    <div className="space-y-2">
                      {selectedMeeting.extractedTasks.map((task, index) => (
                        <div key={index} className="border rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{task.title}</span>
                            {task.priority && (
                              <span className={`px-2 py-1 rounded text-xs ${meetingService.getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMeeting.extractedNotes && selectedMeeting.extractedNotes.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Extracted Notes</h3>
                    <div className="space-y-2">
                      {selectedMeeting.extractedNotes.map((note, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <p className="text-sm">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a meeting to view details</p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Meeting</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  placeholder="Meeting description"
                />
              </div>
              <div>
                <Label htmlFor="method">Transcription Method</Label>
                <select 
                  id="method"
                  value={transcriptionMethod} 
                  onChange={(e) => setTranscriptionMethod(e.target.value as any)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="api">API Transcription</option>
                  <option value="local">Local Transcription</option>
                  <option value="dedicated">Dedicated Service</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateMeeting} disabled={!newMeetingTitle.trim()}>
                  Create Meeting
                </Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Transcription Modal */}
      {showTranscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Add Transcription</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="transcription">Transcription Text</Label>
                <textarea
                  id="transcription"
                  value={transcriptionText}
                  onChange={(e) => setTranscriptionText(e.target.value)}
                  placeholder="Paste or type the meeting transcription here..."
                  className="w-full border rounded px-3 py-2 h-40 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleProcessTranscription} disabled={!transcriptionText.trim()}>
                  Process Transcription
                </Button>
                <Button variant="outline" onClick={() => setShowTranscriptionModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;

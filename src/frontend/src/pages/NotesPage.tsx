/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import useAuthStore from '@/store/authStore';
import AddNoteModal from '@/components/notes/AddNoteModal';
import EditNoteModal from '@/components/notes/EditNoteModal'; // Import EditNoteModal

// Define a local interface for Note data
interface Note {
  _id: string;
  title?: string; // Optional title for notes
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string; // Similar to Tasks, might be useful
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null); // State for the note being edited
  const [showEditNoteModal, setShowEditNoteModal] = useState<boolean>(false); // State for edit modal visibility

  const fetchNotes = async () => {
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/v1/notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const textError = await response.text();
          throw new Error(`Server returned non-JSON error: ${response.status}. Response: ${textError.substring(0, 100)}...`);
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        throw new Error(`Expected JSON response, but got ${contentType}. Response: ${textResponse.substring(0,100)}...`);
      }
      
      const data = await response.json();
      setNotes(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notes.';
      console.error("Failed to fetch notes:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [token]);

  // Placeholder functions - to be implemented later
  const handleOpenAddNoteModal = () => {
    setShowAddNoteModal(true);
  };

  const handleCloseAddNoteModal = () => {
    setShowAddNoteModal(false);
    setError(null); // Clear any modal-specific errors
  };

  const handleSaveNewNote = async (newNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'>) => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      return;
    }
    try {
      const response = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newNoteData),
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const textError = await response.text();
          throw new Error(`Server returned non-JSON error: ${response.status}. Response: ${textError.substring(0, 100)}...`);
        }
        throw new Error(errorData.message || `Failed to create note. Status: ${response.status}`);
      }

      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        throw new Error(`Expected JSON response, but got ${contentType}. Response: ${textResponse.substring(0,100)}...`);
      }
      const createdNote = await response.json();
      setNotes(prevNotes => [createdNote, ...prevNotes]);
      handleCloseAddNoteModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Error creating note:", errorMessage);
      setError(errorMessage); // Display error to the user, could be in the modal or on the page
      // Consider not closing the modal on error, so user can retry or see the error
    }
  };

  const handleOpenEditNoteModal = (note: Note) => { // Renamed from handleEditNote
    setEditingNote(note);
    setShowEditNoteModal(true);
  };

  const handleCloseEditNoteModal = () => {
    setEditingNote(null);
    setShowEditNoteModal(false);
    setError(null); // Clear any modal-specific errors
  };

  const handleSaveEditNote = async (updatedNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'>, noteId: string) => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      return;
    }
    try {
      const response = await fetch(`/api/v1/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedNoteData),
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const textError = await response.text();
          throw new Error(`Server returned non-JSON error: ${response.status}. Response: ${textError.substring(0, 100)}...`);
        }
        throw new Error(errorData.message || `Failed to update note. Status: ${response.status}`);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        throw new Error(`Expected JSON response, but got ${contentType}. Response: ${textResponse.substring(0,100)}...`);
      }
      const savedNote = await response.json();
      setNotes(prevNotes => prevNotes.map(n => (n._id === savedNote._id ? savedNote : n)));
      handleCloseEditNoteModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Error updating note:", errorMessage);
      setError(errorMessage);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!token) {
      alert('Authentication token not found. Please log in.');
      return;
    }
    // Optional: Add a confirmation dialog
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }
    try {
      const response = await fetch(`/api/v1/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData;
        // For DELETE, backend might send JSON or just a status with no content type or text/plain.
        // If it's JSON, parse it. Otherwise, use status or text.
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete note. Status: ${response.status}`);
        } else {
          const textError = await response.text();
          // If textError is empty, it might be a 204 No Content successfully, but response.ok was false (which is unusual)
          // or a proper error with text.
          if (textError) {
            throw new Error(`Failed to delete note. Status: ${response.status}. Response: ${textError.substring(0,100)}...`);
          } else {
            throw new Error(`Failed to delete note. Status: ${response.status}. Server returned no error message.`);
          }
        }
      }
      
      // For a successful DELETE, the response might be empty (204 No Content)
      // or it might be a JSON confirmation.
      // If it's not specifically application/json, but it was 'ok', we assume success.
      // If it IS application/json, we should parse it.
      // However, the original code didn't parse response.json() on successful DELETE.
      // It only checked response.ok. The backend sends { message: 'Note deleted successfully' } with 200.

      if (contentType && contentType.includes("application/json")) {
        // const result = await response.json(); // Potentially use result if needed
        // console.log('Delete successful with JSON response:', result);
      } else if (response.status === 204) { // No Content
        // console.log('Delete successful with 204 No Content');
      } else if (response.ok && !(contentType && contentType.includes("application/json"))) {
        // console.log('Delete successful, non-JSON response (e.g. text/plain or empty). Status:', response.status);
      }

      // Update notes list in UI by filtering out the deleted note
      setNotes(prevNotes => prevNotes.filter(note => note._id !== noteId));
      // Optionally, show a success message/toast
      // alert('Note deleted successfully!'); 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Error deleting note:", errorMessage);
      setError(errorMessage); // Display error to the user
      // alert(`Error deleting note: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-muted-foreground">Loading notes...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Notes</h1>
        <button
          onClick={handleOpenAddNoteModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded shadow"
        >
          Add New Note
        </button>
      </div>

      {notes.length === 0 && !loading && (
        <p className="text-muted-foreground">No notes found. Click "Add New Note" to create one.</p>
      )}

      <ul className="space-y-4">
        {notes.map((note) => (
          <li key={note._id} className="p-4 border rounded-lg shadow-sm bg-card">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                {note.title && <h2 className="text-xl font-semibold text-card-foreground mb-1">{note.title}</h2>}
                <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">Created: {new Date(note.createdAt).toLocaleString()}</p>
                {note.source && <p className="text-xs text-muted-foreground mt-1">Source: {note.source}</p>}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0 ml-4 mt-2 sm:mt-0">
                <button 
                  onClick={() => handleOpenEditNoteModal(note)} // Use the renamed handler
                  className="p-1.5 px-3 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100 transition-colors text-xs border border-blue-300 hover:border-blue-500 w-full sm:w-auto"
                  title="Edit Note"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteNote(note._id)} 
                  className="p-1.5 px-3 text-red-600 hover:text-red-800 rounded hover:bg-red-100 transition-colors text-xs border border-red-300 hover:border-red-500 w-full sm:w-auto"
                  title="Delete Note"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Modals will be added here later */}
      {showAddNoteModal && (
        <AddNoteModal 
          isOpen={showAddNoteModal}
          onClose={handleCloseAddNoteModal}
          onSave={handleSaveNewNote}
        />
      )}
      {showEditNoteModal && editingNote && (
        <EditNoteModal
          isOpen={showEditNoteModal}
          note={editingNote}
          onClose={handleCloseEditNoteModal}
          onSave={handleSaveEditNote}
        />
      )}
    </div>
  );
};

export default NotesPage; 
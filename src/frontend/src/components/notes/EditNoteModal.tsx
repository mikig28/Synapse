/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';

// Define a local interface for Note data for the modal
interface Note {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

export interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null; // Note to edit, null if not editing
  onSave: (updatedNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'>, noteId: string) => Promise<void>; 
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, note, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setError(null);
      setIsSubmitting(false);
    } else if (!isOpen) {
      // Reset when modal is closed externally
      setTitle('');
      setContent('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) {
      setError('No note selected for editing.');
      return;
    }
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    
    const updatedNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'> = {
      title: title.trim() || undefined,
      content,
    };

    try {
      await onSave(updatedNoteData, note._id);
      // Parent (NotesPage) will call onClose after successful save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note. Please try again.';
      console.error("Error in EditNoteModal onSave:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-card-foreground">
        <h2 className="text-xl font-semibold mb-4">Edit Note</h2>
        {error && <p className="text-red-500 bg-red-100 p-2 rounded mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="edit-note-title" className="block text-sm font-medium text-muted-foreground mb-1">Title (Optional)</label>
            <input
              type="text"
              id="edit-note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="edit-note-content" className="block text-sm font-medium text-muted-foreground mb-1">Content <span className="text-red-500">*</span></label>
            <textarea
              id="edit-note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:bg-primary/70"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNoteModal; 
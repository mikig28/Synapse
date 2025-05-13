/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';

// Define a local interface for Note data for the modal
// This should align with the Note interface in NotesPage.tsx or a shared type
interface Note {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

export interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'>) => Promise<void>; // source is usually backend-derived
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    
    const newNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'> = {
      title: title.trim() || undefined, // Send undefined if title is empty
      content,
    };

    try {
      await onSave(newNoteData);
      // Parent (NotesPage) will call onClose after successful save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note. Please try again.';
      console.error("Error in AddNoteModal onSave:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-card-foreground">
        <h2 className="text-xl font-semibold mb-4">Add New Note</h2>
        {error && <p className="text-red-500 bg-red-100 p-2 rounded mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="note-title" className="block text-sm font-medium text-muted-foreground mb-1">Title (Optional)</label>
            <input
              type="text"
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="note-content" className="block text-sm font-medium text-muted-foreground mb-1">Content <span className="text-red-500">*</span></label>
            <textarea
              id="note-content"
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
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNoteModal; 
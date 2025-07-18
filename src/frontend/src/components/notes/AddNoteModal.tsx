/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { X, AlertCircle } from 'lucide-react';
import { Note } from '@/pages/NotesPage'; // Assuming Note type is exported from NotesPage or a types file
import LocationPicker, { LocationData } from '@/components/location/LocationPicker';

// Define a local interface for Note data for the modal
// This should align with the Note interface in NotesPage.tsx or a shared type
interface Note {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  location?: LocationData;
}

export interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  existingError?: string | null;
  clearError?: () => void;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSave, existingError, clearError }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setSource('');
      setLocation(null);
      setInternalError(null);
      setIsSubmitting(false);
    }
    if (existingError && clearError) {
      setInternalError(existingError);
      // Optional: Clear the page-level error once it's displayed in the modal
      // clearError(); 
    }
  }, [isOpen, existingError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setInternalError('Content is required.');
      return;
    }
    setInternalError(null);
    if (clearError) clearError(); // Clear any page-level error before attempting save
    setIsSubmitting(true);
    
    const newNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim() || undefined, // Send undefined if title is empty
      content,
      source: source.trim(),
      location: location || undefined,
    };

    try {
      await onSave(newNoteData);
      // Parent (NotesPage) will call onClose after successful save
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save note. Please try again.";
      console.error("Error in AddNoteModal onSave:", errorMessage);
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentError = internalError || existingError;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
        <GlassCard className="p-4 sm:p-6 rounded-lg shadow-xl text-card-foreground">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Note</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-muted/50 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{currentError}</p>
          </div>
        )}

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
          <div className="mb-4">
            <label htmlFor="note-source" className="block text-sm font-medium text-muted-foreground mb-1">Source (Optional)</label>
            <input
              type="text"
              id="note-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="mb-4">
            <LocationPicker
              onLocationSelect={setLocation}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 bg-background/50 backdrop-blur-sm rounded-b-lg -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 w-full sm:w-auto"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:bg-primary/70 w-full sm:w-auto"
            >
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default AddNoteModal; 
/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { X, AlertCircle } from 'lucide-react';
import { Note } from '@/pages/NotesPage'; // Assuming Note type is exported
import LocationPicker, { LocationData } from '@/components/location/LocationPicker';

// Define a local interface for Note data for the modal
interface Note {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  location?: LocationData;
}

export interface EditNoteModalProps {
  isOpen: boolean;
  note: Note; // Note to edit
  onClose: () => void;
  onSave: (noteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt'>, noteId: string) => Promise<void>;
  existingError?: string | null;
  clearError?: () => void;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ 
  isOpen, 
  note, 
  onClose, 
  onSave,
  existingError,
  clearError 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setSource(note.source || '');
      setLocation(note.location || null);
      setInternalError(null);
      setIsSubmitting(false);
      if (existingError && clearError) {
        setInternalError(existingError);
        // clearError(); // Optional
      }
    } else if (!isOpen) {
      // Reset form when modal is closed or note is not available
      setTitle('');
      setContent('');
      setSource('');
      setLocation(null);
      setInternalError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, note, existingError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) {
      setInternalError('No note selected for editing.');
      return;
    }
    if (!content.trim()) {
      setInternalError('Content is required.');
      return;
    }
    setInternalError(null);
    if (clearError) clearError();
    setIsSubmitting(true);
    
    const updatedNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim() || undefined,
      content: content.trim(),
      source: source.trim() || undefined,
      location: location || undefined,
    };

    try {
      await onSave(updatedNoteData, note._id);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update note. Please try again.";
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentError = internalError || existingError;

  if (!isOpen || !note) return null; // Render nothing if not open or no note

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} // Ensure exit animation if modal is conditionally rendered with AnimatePresence
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
    >
      <GlassCard className="w-full max-w-md p-6 rounded-xl shadow-2xl text-white border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Edit Note</h2>
          <motion.button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {currentError && (
          <div className="mb-4 p-3 bg-red-700/30 border border-red-500/50 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{currentError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-note-title" className="block text-sm font-medium text-gray-300 mb-1">Title (Optional)</label>
            <input
              type="text"
              id="edit-note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="edit-note-content" className="block text-sm font-medium text-gray-300 mb-1">Content <span className="text-red-400">*</span></label>
            <textarea
              id="edit-note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full p-2.5 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="edit-note-source" className="block text-sm font-medium text-gray-300 mb-1">Source (Optional)</label>
            <input
              type="text"
              id="edit-note-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-2.5 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
              disabled={isSubmitting}
            />
          </div>
          <div className="mb-4">
            <LocationPicker
              initialLocation={location}
              onLocationSelect={setLocation}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <AnimatedButton 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              variant="ghost" 
              className="text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton 
              type="submit" 
              disabled={isSubmitting}
              loading={isSubmitting}
              variant="gradient"
              className="bg-gradient-to-r from-lime-500 to-emerald-600 hover:shadow-emerald-500/30"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </AnimatedButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
};

export default EditNoteModal; 
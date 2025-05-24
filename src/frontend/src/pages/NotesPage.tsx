/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import AddNoteModal from '@/components/notes/AddNoteModal';
import EditNoteModal from '@/components/notes/EditNoteModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonCard, SkeletonText, Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/input';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { BACKEND_ROOT_URL } from "@/services/axiosConfig";
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { 
  StickyNote, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  FileText, 
  Sparkles,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';

// Define a local interface for Note data
export interface Note {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

const API_BASE_URL = `${BACKEND_ROOT_URL}/api/v1`;

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const token = useAuthStore((state) => state.token);

  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditNoteModal, setShowEditNoteModal] = useState<boolean>(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const fetchNotes = async () => {
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
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

  const handleOpenAddNoteModal = () => {
    setShowAddNoteModal(true);
  };

  const handleCloseAddNoteModal = () => {
    setShowAddNoteModal(false);
    setError(null);
  };

  const handleSaveNewNote = async (newNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'>) => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
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
      setError(errorMessage);
    }
  };

  const handleOpenEditNoteModal = (note: Note) => {
    setEditingNote(note);
    setShowEditNoteModal(true);
  };

  const handleCloseEditNoteModal = () => {
    setEditingNote(null);
    setShowEditNoteModal(false);
    setError(null);
  };

  const handleSaveEditNote = async (updatedNoteData: Omit<Note, '_id' | 'createdAt' | 'updatedAt' | 'source'>, noteId: string) => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
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
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete note. Status: ${response.status}`);
        } else {
          const textError = await response.text();
          if (textError && textError.length > 0) {
            throw new Error(`Failed to delete note. Status: ${response.status}. Response: ${textError.substring(0,100)}...`);
          }
          if (response.status !== 204) {
             throw new Error(`Failed to delete note. Status: ${response.status}. Server returned no error message.`);
          }
        }
      }
      setNotes(prevNotes => prevNotes.filter(note => note._id !== noteId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Error deleting note:", errorMessage);
      alert(`Error deleting note: ${errorMessage}`);
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNotes = notes.length;
  const recentNotesCount = notes.filter(note => {
    const createdDate = new Date(note.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate >= weekAgo;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lime-900 via-green-900 to-emerald-900 p-6 flex flex-col items-center text-white">
        <FloatingParticles items={20} particleClassName="bg-green-200/10" />
        <motion.div className="text-center z-10 mb-8" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
          <StickyNote className="w-16 h-16 text-lime-400/70 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-lime-200/80">Loading your notes...</p>
        </motion.div>
        <div className="container mx-auto w-full max-w-4xl z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[...Array(2)].map((_, i) => (
              <SkeletonCard key={i} className="h-24 bg-green-500/10" />
            ))}
          </div>
          <div className="mb-6">
            <Skeleton className="h-10 w-full bg-green-500/10 rounded-md" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} className="h-32 bg-green-500/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !showAddNoteModal && !showEditNoteModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-800 to-rose-900 flex items-center justify-center p-6 text-white">
        <FloatingParticles items={15} type="error" />
        <GlassCard className="p-8 text-center max-w-md z-10">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <AnimatedButton 
            onClick={() => { setError(null); fetchNotes(); }} 
            variant="ghost"
            className="bg-red-500/20 hover:bg-red-600/30 text-red-200 border border-red-400/50"
          >
            Try Again
          </AnimatedButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-900 via-green-900 to-emerald-900 relative overflow-hidden">
      <FloatingParticles items={30} particleClassName="bg-green-200/15" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-full blur-3xl animate-pulse-slow"
          style={{ top: '5%', right: '15%' }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-lime-400/10 to-green-400/10 rounded-full blur-3xl animate-pulse-medium"
          style={{ bottom: '10%', left: '20%' }}
        />
      </div>

      <motion.div 
        className="relative z-10 container mx-auto p-4 md:p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="text-center mb-8 md:mb-12"
          variants={itemVariants}
        >
          <div className="flex items-center justify-center mb-4">
            <StickyNote className="w-10 h-10 md:w-12 md:h-12 text-lime-300" />
            <h1 className="ml-4 text-4xl md:text-5xl font-bold 
              bg-clip-text text-transparent bg-gradient-to-r from-lime-300 via-green-300 to-emerald-400">
              My Notes
            </h1>
            <Sparkles className="ml-3 w-7 h-7 text-emerald-400 opacity-70" />
          </div>
          <p className="text-lg md:text-xl text-green-200/80 max-w-2xl mx-auto">
            Capture, organize, and revisit your thoughts and ideas seamlessly.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 md:mb-8 max-w-lg mx-auto"
          variants={itemVariants}
        >
          <GlassCard className="p-4 text-center hover:scale-105 transition-transform">
            <FileText className="w-7 h-7 text-lime-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white">{totalNotes}</h3>
            <p className="text-xs text-lime-100/70">Total Notes</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover:scale-105 transition-transform">
            <Calendar className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white">{recentNotesCount}</h3>
            <p className="text-xs text-emerald-100/70">Added This Week</p>
          </GlassCard>
        </motion.div>

        <motion.div 
          className="mb-6 md:mb-8 p-4 bg-black/10 rounded-xl shadow-lg backdrop-blur-sm max-w-3xl mx-auto"
          variants={itemVariants}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <Input 
                type="text"
                placeholder="Search notes by title or content..."
                className="pl-10 bg-white/5 border-white/10 placeholder-gray-400 text-white focus:border-lime-500 focus:ring-lime-500 transition-shadow duration-300 focus:shadow-lime-500/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            
            <AnimatedButton 
              onClick={handleOpenAddNoteModal} 
              variant="gradient"
              className="w-full md:w-auto from-lime-500 via-green-500 to-emerald-600 hover:shadow-green-500/40 text-white glow-effect-green"
            >
              <Plus className="mr-2 h-5 w-5" /> Add New Note
            </AnimatedButton>
          </div>
        </motion.div>

        {filteredNotes.length === 0 && !loading ? (
          <motion.div 
            className="text-center py-10"
            variants={itemVariants}
          >
            <GlassCard className="p-10 max-w-md mx-auto">
              <StickyNote className="w-16 h-16 text-lime-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No notes found</h3>
              <p className="text-lime-100/70">
                Try adjusting your search, or create your first note!
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            variants={containerVariants} 
            initial="hidden"
            animate="visible"
          >
            {filteredNotes.map(note => (
              <motion.div
                key={note._id}
                variants={itemVariants}
                layout
              >
                <GlassCard 
                  className={`p-4 md:p-5 flex flex-col h-full group transition-all duration-300 ease-in-out hover:shadow-lime-500/30 hover:border-lime-500/50`}
                  glowColor="rgba(163, 230, 53, 0.4)"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-lime-300 transition-colors line-clamp-2">
                      {note.title || 'Untitled Note'}
                    </h3>
                    {note.source && (
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-md whitespace-nowrap">
                        {note.source}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-300/80 mb-3 flex-grow min-h-[60px] whitespace-pre-wrap overflow-y-auto max-h-32 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {note.content.length > 200 ? note.content.substring(0, 197) + '...' : note.content}
                  </p>

                  <div className="text-xs text-gray-400/80 mt-auto pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            Created: {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                            <Edit size={12} className="mr-1" />
                            Updated: {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <AnimatedButton 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenEditNoteModal(note)} 
                      className="border border-sky-500/50 text-sky-300 hover:bg-sky-500/20 hover:border-sky-500 hover:text-sky-200 glow-effect-sky-sm"
                    >
                      <Edit size={14} className="mr-1" /> Edit
                    </AnimatedButton>
                    <AnimatedButton 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDeleteNote(note._id)} 
                      className="border border-rose-500/50 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500 hover:text-rose-200 glow-effect-rose-sm"
                    >
                      <Trash2 size={14} className="mr-1"/> Delete
                    </AnimatedButton>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {showAddNoteModal && (
          <AddNoteModal 
            isOpen={showAddNoteModal}
            onClose={handleCloseAddNoteModal} 
            onSave={handleSaveNewNote} 
            existingError={error}
            clearError={() => setError(null)}
          />
        )}
        {showEditNoteModal && editingNote && (
          <EditNoteModal 
            isOpen={showEditNoteModal}
            note={editingNote} 
            onClose={handleCloseEditNoteModal} 
            onSave={(data) => handleSaveEditNote(data, editingNote._id)} 
            existingError={error}
            clearError={() => setError(null)}
          />
        )}
      </motion.div>
    </div>
  );
};

export default NotesPage; 
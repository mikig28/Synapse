/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import AddNoteModal from '@/components/notes/AddNoteModal';
import EditNoteModal from '@/components/notes/EditNoteModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { BACKEND_ROOT_URL } from "@/services/axiosConfig";
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
interface Note {
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

  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();
  const { ref: statsRef, isInView: statsVisible } = useScrollAnimation();

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
          if (textError) {
            throw new Error(`Failed to delete note. Status: ${response.status}. Response: ${textError.substring(0,100)}...`);
          } else {
            throw new Error(`Failed to delete note. Status: ${response.status}. Server returned no error message.`);
          }
        }
      }

      setNotes(prevNotes => prevNotes.filter(note => note._id !== noteId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Error deleting note:", errorMessage);
      setError(errorMessage);
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNotes = notes.length;
  const recentNotes = notes.filter(note => {
    const createdDate = new Date(note.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate >= weekAgo;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Notes</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <AnimatedButton onClick={fetchNotes} className="bg-red-500 hover:bg-red-600">
            Try Again
          </AnimatedButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          style={{ top: '10%', right: '10%' }}
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '10%' }}
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <StickyNote className="w-12 h-12 text-blue-400" />
            </motion.div>
            <motion.div
              className="ml-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            My Notes
          </h1>
          <p className="text-blue-100/80 text-lg max-w-2xl mx-auto">
            Capture your thoughts, ideas, and insights in your digital notebook
          </p>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          ref={statsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={statsVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{totalNotes}</h3>
            <p className="text-blue-100/70">Total Notes</p>
          </GlassCard>
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <Calendar className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{recentNotes}</h3>
            <p className="text-blue-100/70">This Week</p>
          </GlassCard>
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <Search className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{filteredNotes.length}</h3>
            <p className="text-blue-100/70">Filtered Results</p>
          </GlassCard>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder:text-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
              />
            </div>
          </div>
          
          <AnimatedButton
            onClick={handleOpenAddNoteModal}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 px-6 py-3"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Note
            </span>
          </AnimatedButton>
        </motion.div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 && !loading && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-12 max-w-md mx-auto">
              <StickyNote className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'No matching notes' : 'No notes yet'}
              </h3>
              <p className="text-blue-100/70 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first note to get started'
                }
              </p>
              {!searchTerm && (
                <AnimatedButton 
                  onClick={handleOpenAddNoteModal}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create First Note
                  </span>
                </AnimatedButton>
              )}
            </GlassCard>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note, index) => (
            <motion.div
              key={note._id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <GlassCard className="p-6 h-full flex flex-col hover:scale-105 transition-transform duration-300">
                <div className="flex-1">
                  {note.title && (
                    <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-blue-100/80 leading-relaxed mb-4 line-clamp-4">
                    {note.content}
                  </p>
                </div>
                
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-center justify-between text-sm text-blue-200/60 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    {note.source && (
                      <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">
                        {note.source}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <AnimatedButton
                      onClick={() => handleOpenEditNoteModal(note)}
                      variant="ghost"
                      size="sm"
                      className="flex-1 border-blue-400/30 text-blue-300 hover:bg-blue-500/10"
                    >
                      <span className="flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </span>
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={() => handleDeleteNote(note._id)}
                      variant="ghost"
                      size="sm"
                      className="flex-1 border-red-400/30 text-red-300 hover:bg-red-500/10"
                    >
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </span>
                    </AnimatedButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modals */}
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
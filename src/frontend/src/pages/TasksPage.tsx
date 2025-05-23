/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore'; // To get the auth token
import EditTaskModal from '../components/tasks/EditTaskModal'; // Import the modal using relative path
import AddTaskModal from '../components/tasks/AddTaskModal'; // Corrected path using relative path
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Task } from '../../types/task'; // Using the centralized Task type
import axiosInstance from '@/services/axiosConfig'; // Import axiosInstance
import { 
  CheckSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  Target,
  Sparkles,
  AlertCircle,
  Search,
  Filter,
  TrendingUp
} from 'lucide-react';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const token = useAuthStore((state) => state.token);

  // State for editing a task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);

  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();
  const { ref: statsRef, isInView: statsVisible } = useScrollAnimation();

  const fetchTasks = async () => {
    // Token check can be removed if axiosInstance handles auth errors globally (e.g., by logging out)
    // For now, let's keep it as a guard, though axiosInstance will send the token.
    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Use axiosInstance for the request
      const response = await axiosInstance.get<Task[]>('/tasks');
      setTasks(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch tasks:", err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]); // Dependency on token can remain if you want to refetch on login/logout

  const handleDelete = async (taskId: string) => {
    if (!token) {
      alert('Authentication token not found.');
      return;
    }
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      // Use axiosInstance for the request
      await axiosInstance.delete(`/tasks/${taskId}`);
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
      alert('Task deleted successfully!');
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      alert(`Error deleting task: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingTask(null);
    setShowEditModal(false);
  };

  const handleSaveEdit = async (updatedTask: Task) => {
    if (!token || !updatedTask) { // Token check can be debated if axiosInstance handles it
      alert('Missing data for update.');
      return;
    }
    try {
      // Prepare only the fields that should be updated
      const payload = {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
      };
      // Use axiosInstance for the request
      const response = await axiosInstance.put<Task>(`/tasks/${updatedTask._id}`, payload);
      const savedTask = response.data;
      setTasks(prevTasks => prevTasks.map(task => task._id === savedTask._id ? savedTask : task));
      alert('Task updated successfully!');
      handleCloseEditModal();
    } catch (err: any) {
      console.error("Failed to update task:", err);
      alert(`Error updating task: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleOpenAddTaskModal = () => {
    setShowAddTaskModal(true);
  };

  const handleCloseAddTaskModal = () => {
    setShowAddTaskModal(false);
  };

  const handleSaveNewTask = async (newTaskData: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>) => {
    if (!token) { // Token check similar to above
      setError("Authentication token not found. Please log in.");
      setLoading(false);
      return;
    }
    try {
      // Use axiosInstance for the request
      const response = await axiosInstance.post<Task>('/tasks', newTaskData);
      const createdTask = response.data;
      setTasks(prevTasks => [createdTask, ...prevTasks]);
      handleCloseAddTaskModal();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || (err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Error creating task:", errorMessage);
      setError(errorMessage);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'in-progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Tasks</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <AnimatedButton onClick={fetchTasks} className="bg-red-500 hover:bg-red-600">
            Try Again
          </AnimatedButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          style={{ top: '10%', right: '10%' }}
          animate={{
            x: [0, -60, 0],
            y: [0, 40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-violet-400/20 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '10%' }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 18,
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
              <CheckSquare className="w-12 h-12 text-purple-400" />
            </motion.div>
            <motion.div
              className="ml-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            My Tasks
          </h1>
          <p className="text-purple-100/80 text-lg max-w-2xl mx-auto">
            Organize, track, and complete your goals with intelligent task management
          </p>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          ref={statsRef}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={statsVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{totalTasks}</h3>
            <p className="text-purple-100/70">Total Tasks</p>
          </GlassCard>
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <CheckSquare className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{completedTasks}</h3>
            <p className="text-purple-100/70">Completed</p>
          </GlassCard>
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{inProgressTasks}</h3>
            <p className="text-purple-100/70">In Progress</p>
          </GlassCard>
          <GlassCard className="p-6 text-center hover:scale-105 transition-transform duration-300">
            <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">{pendingTasks}</h3>
            <p className="text-purple-100/70">Pending</p>
          </GlassCard>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 appearance-none cursor-pointer"
              >
                <option value="all" className="bg-gray-800">All Status</option>
                <option value="pending" className="bg-gray-800">Pending</option>
                <option value="in-progress" className="bg-gray-800">In Progress</option>
                <option value="completed" className="bg-gray-800">Completed</option>
              </select>
            </div>
          </div>
          
          <AnimatedButton
            onClick={handleOpenAddTaskModal}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 px-6 py-3"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Task
            </span>
          </AnimatedButton>
        </motion.div>

        {/* Tasks Grid */}
        {filteredTasks.length === 0 && !loading && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-12 max-w-md mx-auto">
              <CheckSquare className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No matching tasks' : 'No tasks yet'}
              </h3>
              <p className="text-purple-100/70 mb-6">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Create your first task to get started'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <AnimatedButton 
                  onClick={handleOpenAddTaskModal}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create First Task
                  </span>
                </AnimatedButton>
              )}
            </GlassCard>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <GlassCard className="p-6 h-full flex flex-col hover:scale-105 transition-transform duration-300">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-purple-100/80 leading-relaxed mb-4 line-clamp-3">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      {task.priority && (
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority} priority
                        </span>
                      )}
                    </div>
                    
                    {task.source && (
                      <span className="inline-block px-2 py-1 bg-violet-500/20 rounded text-violet-300 text-xs">
                        {task.source}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-center justify-between text-sm text-purple-200/60 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <AnimatedButton
                      onClick={() => handleEdit(task)}
                      variant="ghost"
                      size="sm"
                      className="flex-1 border-purple-400/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      <span className="flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </span>
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={() => handleDelete(task._id)}
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
      {showEditModal && editingTask && (
        <EditTaskModal
          isOpen={showEditModal}
          task={editingTask}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
        />
      )}

      {showAddTaskModal && (
        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={handleCloseAddTaskModal}
          onSave={handleSaveNewTask}
        />
      )}
    </div>
  );
};

export default TasksPage; 
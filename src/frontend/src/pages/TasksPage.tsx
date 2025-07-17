/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore'; // To get the auth token
import EditTaskModal from '../components/tasks/EditTaskModal'; // Import the modal using relative path
import AddTaskModal from '../components/tasks/AddTaskModal'; // Corrected path using relative path
import AddToCalendarModal from '../components/tasks/AddToCalendarModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SkeletonText, Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Task } from '../../types/task'; // Using the centralized Task type
import axiosInstance from '@/services/axiosConfig'; // Import axiosInstance
import { sendManualTaskReminder } from '@/services/taskService'; // Import task service
import { FloatingParticles } from '@/components/common/FloatingParticles';
import KanbanView from '../components/tasks/KanbanView'; // Import Kanban view
import { 
  CheckSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  CalendarPlus,
  Clock, 
  Target,
  Sparkles,
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  Bell, // Added for reminder button
  LayoutGrid,
  List,
  MapPin
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Added useToast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Added AlertDialog

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const token = useAuthStore((state) => state.token);
  const { toast } = useToast(); // Initialize toast

  // State for editing a task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [showAddToCalendarModal, setShowAddToCalendarModal] = useState<boolean>(false);
  const [taskForCalendar, setTaskForCalendar] = useState<Task | null>(null);
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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

  const fetchTasks = async () => {
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.get<Task[]>('/tasks');
      setTasks(response.data);
      setError(null);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch tasks.';
      console.error("Failed to fetch tasks:", errMsg);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const handleDelete = async (taskId: string) => {
    if (!token) {
      toast({ title: "Authentication Error", description: "Authentication token not found.", variant: "destructive" });
      return;
    }
    try {
      await axiosInstance.delete(`/tasks/${taskId}`);
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
      toast({ title: "Task Deleted", description: "Task deleted successfully!", variant: "default" });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Unknown error during deletion.';
      console.error("Failed to delete task:", errMsg);
      toast({ title: "Deletion Failed", description: `Error: ${errMsg}`, variant: "destructive" });
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
    if (!token || !updatedTask) {
      toast({ title: "Update Error", description: "Missing data for update.", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        location: updatedTask.location,
      };
      const response = await axiosInstance.put<Task>(`/tasks/${updatedTask._id}`, payload);
      const savedTask = response.data;
      setTasks(prevTasks => prevTasks.map(task => task._id === savedTask._id ? savedTask : task));
      toast({ title: "Task Updated", description: "Task updated successfully!", variant: "default" });
      handleCloseEditModal();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Unknown error during update.';
      console.error("Failed to update task:", errMsg);
      toast({ title: "Update Failed", description: `Error: ${errMsg}`, variant: "destructive" });
    }
  };

  const handleOpenAddTaskModal = () => {
    setShowAddTaskModal(true);
  };

  const handleCloseAddTaskModal = () => {
    setShowAddTaskModal(false);
  };

  const handleSaveNewTask = async (newTaskData: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>) => {
    if (!token) {
      toast({ title: "Creation Error", description: "Authentication token not found. Please log in.", variant: "destructive" });
      return;
    }
    try {
      const response = await axiosInstance.post<Task>('/tasks', newTaskData);
      const createdTask = response.data;
      setTasks(prevTasks => [createdTask, ...prevTasks]);
      toast({ title: "Task Created", description: "New task added successfully!", variant: "default" });
      handleCloseAddTaskModal();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || (err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Error creating task:", errMsg);
      toast({ title: "Creation Failed", description: `Error: ${errMsg}`, variant: "destructive" });
    }
  };

  const handleOpenAddToCalendarModal = (task: Task) => {
    setTaskForCalendar(task);
    setShowAddToCalendarModal(true);
  };

  const handleCloseAddToCalendarModal = () => {
    setTaskForCalendar(null);
    setShowAddToCalendarModal(false);
  };

  const handleEventAddedToCalendar = () => {
    toast({ title: "Success", description: "Task has been scheduled in the calendar." });
    // Optionally, refresh tasks or perform other actions if needed.
    // fetchTasks(); // Example if you want to re-fetch tasks
  };

  const handleSendManualReminder = async () => {
    if (!token) {
      toast({ title: "Authentication Error", description: "Authentication token not found.", variant: "destructive" });
      return;
    }
    setSendingReminder(true);
    try {
      await sendManualTaskReminder();
      toast({ title: "Reminder Sent", description: "Task reminder sent to your Telegram successfully!", variant: "default" });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to send reminder.';
      console.error("Failed to send manual reminder:", errMsg);
      toast({ title: "Reminder Failed", description: `Error: ${errMsg}`, variant: "destructive" });
    } finally {
      setSendingReminder(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const titleMatches = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const descriptionMatches = (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = titleMatches || descriptionMatches;
    const matchesFilter = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'in-progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 flex flex-col items-center text-white">
        <FloatingParticles items={20} />
        <motion.div className="text-center z-10 mb-8" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
          <Target className="w-16 h-16 text-pink-400/70 mx-auto mb-4 animate-spin-slow" />
          <p className="text-lg text-pink-200/80">Loading your tasks...</p>
        </motion.div>
        <div className="container mx-auto w-full max-w-4xl z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={`stat-skel-outer-${i}`} className="h-24 bg-purple-500/10 p-4 rounded-lg">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
          <div className="mb-6">
            <Skeleton className="h-10 w-full bg-purple-500/10 rounded-md" /> 
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={`task-item-skel-outer-${i}`} className="h-28 bg-purple-500/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-1/4" />
                </div>
                <SkeletonText lines={2} />
                <div className="flex justify-end mt-2">
                  <Skeleton className="h-8 w-16 mr-2 rounded" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-rose-900 flex items-center justify-center p-6 text-white">
        <FloatingParticles items={15} type="error" />
        <GlassCard className="p-8 text-center max-w-md z-10">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      <FloatingParticles items={30} particleClassName="bg-pink-200/10" />
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <motion.div 
        className="relative z-10 container mx-auto p-4 md:p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8 md:mb-12"
          variants={itemVariants}
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

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 md:mb-8"
          variants={itemVariants}
        >
          <GlassCard className="p-4 text-center hover:scale-105 transition-transform">
            <Target className="w-7 h-7 text-pink-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white">{totalTasks}</h3>
            <p className="text-xs text-pink-100/70">Total Tasks</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover:scale-105 transition-transform">
            <CheckSquare className="w-7 h-7 text-green-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white">{completedTasks}</h3>
            <p className="text-xs text-green-100/70">Completed</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover:scale-105 transition-transform">
            <Clock className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white">{pendingTasks}</h3>
            <p className="text-xs text-yellow-100/70">Pending</p>
          </GlassCard>
          <GlassCard className="p-4 text-center hover:scale-105 transition-transform">
            <TrendingUp className="w-7 h-7 text-blue-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white">{inProgressTasks}</h3>
            <p className="text-xs text-blue-100/70">In Progress</p>
          </GlassCard>
        </motion.div>

        {/* Controls: Search, Filter, Add Task Button */}
        <motion.div 
          className="mb-6 md:mb-8 p-4 bg-black/10 rounded-xl shadow-lg backdrop-blur-sm"
          variants={itemVariants}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <Input 
                type="text"
                placeholder="Search tasks..."
                className="pl-10 bg-white/5 border-white/10 placeholder-gray-400 text-white focus:border-pink-500 focus:ring-pink-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            
            <div className="relative w-full md:w-auto md:min-w-[180px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-pink-500 focus:ring-pink-500">
                  <Filter className="inline w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800/90 border-gray-700 text-white backdrop-blur-md">
                  <SelectItem value="all" className="hover:bg-pink-500/20">All Statuses</SelectItem>
                  <SelectItem value="pending" className="hover:bg-pink-500/20">Pending</SelectItem>
                  <SelectItem value="in-progress" className="hover:bg-pink-500/20">In Progress</SelectItem>
                  <SelectItem value="completed" className="hover:bg-pink-500/20">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* View Mode Toggle */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${
                    viewMode === 'list' 
                      ? 'bg-pink-500/30 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">List</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${
                    viewMode === 'kanban' 
                      ? 'bg-pink-500/30 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Kanban</span>
                </button>
              </div>
              
              <AnimatedButton 
                onClick={handleSendManualReminder} 
                className="w-full md:w-auto glow-blue-md"
                variant="outline"
                loading={sendingReminder}
                disabled={sendingReminder}
              >
                <Bell className="mr-2 h-5 w-5" /> Send Reminder
              </AnimatedButton>
              <AnimatedButton 
                onClick={handleOpenAddTaskModal} 
                className="w-full md:w-auto glow-purple-md"
                variant="gradient"
              >
                <Plus className="mr-2 h-5 w-5" /> Add New Task
              </AnimatedButton>
            </div>
          </div>
        </motion.div>

        {/* Tasks View */}
        {filteredTasks.length === 0 ? (
          <motion.div 
            className="text-center py-10"
            variants={itemVariants}
          >
            <GlassCard className="p-10 max-w-md mx-auto">
              <CheckSquare className="w-16 h-16 text-pink-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No tasks found</h3>
              <p className="text-pink-100/70">
                Try adjusting your search or filter, or add a new task!
              </p>
            </GlassCard>
          </motion.div>
        ) : viewMode === 'kanban' ? (
          <KanbanView
            tasks={filteredTasks}
            onUpdateTask={handleSaveEdit}
            onEditTask={handleEdit}
            onDeleteTask={handleDelete}
            onAddToCalendar={handleOpenAddToCalendarModal}
          />
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredTasks.map(task => (
              <motion.div
                key={task._id}
                variants={itemVariants}
                layout
              >
                <GlassCard 
                  className={`p-4 md:p-5 flex flex-col h-full group transition-all duration-300 ease-in-out hover:shadow-pink-500/30 hover:border-pink-500/50 ${task.status === 'completed' ? 'opacity-70 hover:opacity-100' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-pink-300 transition-colors">
                      {task.title}
                    </h3>
                    <span 
                      className={`px-2 py-1 text-xs rounded-md border ${getStatusColor(task.status)}`}
                    >
                      {task.status || 'unknown'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300/80 mb-3 flex-grow min-h-[40px]">
                    {task.description ? 
                      (task.description.length > 100 ? task.description.substring(0, 97) + '...' : task.description)
                      : 'No description'}
                  </p>

                  <div className="text-xs text-gray-400/80 mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md border ${getPriorityColor(task.priority)}`}>
                        Priority: {task.priority || 'normal'}
                      </span>
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {task.location && (
                      <div className="flex items-center text-purple-300/80">
                        <MapPin size={12} className="mr-1" />
                        <span className="truncate">
                          {task.location.address || `${task.location.coordinates[1].toFixed(4)}, ${task.location.coordinates[0].toFixed(4)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 mt-auto pt-3 border-t border-white/10">
                    <AnimatedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAddToCalendarModal(task)}
                      className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500 glow-purple-sm"
                    >
                      <CalendarPlus size={14} className="mr-1" /> Calendar
                    </AnimatedButton>

                    <AnimatedButton 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(task)} 
                      className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500 glow-blue-sm"
                    >
                      <Edit size={14} className="mr-1" /> Edit
                    </AnimatedButton>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <AnimatedButton 
                          size="sm" 
                          variant="outline"
                          className="border-red-500/50 text-red-300 hover:bg-red-500/20 hover:border-red-500 glow-red-sm"
                        >
                          <Trash2 size={14} className="mr-1"/> Delete
                        </AnimatedButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass bg-background/80 border-border/30">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This action cannot be undone. This will permanently delete the task
                            "<strong>{task.title}</strong>".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="hover:bg-muted/20">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(task._id)} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}

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
        {showAddToCalendarModal && taskForCalendar && (
          <AddToCalendarModal
            isOpen={showAddToCalendarModal}
            onClose={handleCloseAddToCalendarModal}
            task={taskForCalendar}
            onEventAdded={handleEventAddedToCalendar}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TasksPage;

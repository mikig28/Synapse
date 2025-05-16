/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import useAuthStore from '@/store/authStore'; // To get the auth token
import EditTaskModal from '@/components/tasks/EditTaskModal.tsx'; // Import the modal
// import { Button } from '@/components/ui/button'; // Consider using shadcn Button later
// import { Trash2, Edit3 } from 'lucide-react'; // Icons for buttons
import { Task } from '../../types/task'; // Using the centralized Task type
import axiosInstance from '@/services/axiosConfig'; // Import axiosInstance

// Define the AddTaskModal component path
import AddTaskModal from '@/components/tasks/AddTaskModal.tsx'; // Corrected path

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token); // Token is now automatically handled by axiosInstance

  // State for editing a task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false); // New state for AddTaskModal

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
      const response = await axiosInstance.get('/tasks');
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
      const response = await axiosInstance.put(`/tasks/${updatedTask._id}`, payload);
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
      const response = await axiosInstance.post('/tasks', newTaskData);
      const createdTask = response.data;
      setTasks(prevTasks => [createdTask, ...prevTasks]);
      handleCloseAddTaskModal();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || (err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("Error creating task:", errorMessage);
      setError(errorMessage);
    }
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-primary">Tasks</h1>
      {loading && <p className="text-muted-foreground">Loading tasks...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      <div className="mb-4">
        <button
          onClick={handleOpenAddTaskModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded shadow"
        >
          Add New Task
        </button>
      </div>

      {!loading && !error && (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task._id} className="p-4 border rounded-lg shadow-sm bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">{task.title}</h2>
                  {task.description && <p className="text-muted-foreground mt-1 text-sm">{task.description}</p>}
                  <div className="mt-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 
                        task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'}
                    `}>
                      {task.status}
                    </span>
                    {task.priority && <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">Priority: {task.priority}</span>}
                    {task.source && <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Source: {task.source}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Created: {new Date(task.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2 flex-shrink-0 ml-4">
                  <button 
                    onClick={() => handleEdit(task)} 
                    className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100 transition-colors text-xs"
                    title="Edit Task"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(task._id)} 
                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-100 transition-colors text-xs"
                    title="Delete Task"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
    </div>
  );
};

export default TasksPage; 
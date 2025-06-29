import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../../../types/task';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Edit,
  Trash2,
  Calendar,
  CalendarPlus,
  GripVertical,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

interface KanbanViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddToCalendar: (task: Task) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  icon: React.ReactNode;
}

const columns: KanbanColumn[] = [
  {
    id: 'pending',
    title: 'To Do',
    status: 'pending',
    color: 'from-yellow-500/20 to-orange-500/20',
    icon: <Clock className="w-5 h-5" />
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'in-progress',
    color: 'from-blue-500/20 to-cyan-500/20',
    icon: <AlertCircle className="w-5 h-5" />
  },
  {
    id: 'completed',
    title: 'Done',
    status: 'completed',
    color: 'from-green-500/20 to-emerald-500/20',
    icon: <CheckCircle className="w-5 h-5" />
  }
];

interface SortableTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddToCalendar: (task: Task) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, onEdit, onDelete, onAddToCalendar }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <GlassCard className="p-4 mb-3 hover:shadow-lg transition-all duration-200 cursor-move group">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 text-gray-400 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-white group-hover:text-pink-300 transition-colors">
                {task.title}
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddToCalendar(task)}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Add to Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(task._id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {task.description && (
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${getPriorityColor(task.priority)}`}
              >
                {task.priority || 'normal'}
              </Badge>
              
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              
              {task.reminderEnabled && (
                <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                  🔔
                </Badge>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onAddToCalendar,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTask = tasks.find(t => t._id === active.id);
    if (!activeTask) return;
    
    // Check if dropped on a column
    let targetStatus: string | null = null;
    
    // First check if dropped directly on a column
    const overColumn = columns.find(col => col.id === over.id);
    if (overColumn) {
      targetStatus = overColumn.status;
    } else {
      // If dropped on a task, find which column that task belongs to
      const overTask = tasks.find(t => t._id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }
    
    if (targetStatus && activeTask.status !== targetStatus) {
      // Update task status
      onUpdateTask({
        ...activeTask,
        status: targetStatus as 'pending' | 'in-progress' | 'completed'
      });
    }
    
    setActiveId(null);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.status);
          const { setNodeRef, isOver } = useDroppable({
            id: column.id,
          });
          
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: columns.indexOf(column) * 0.1 }}
            >
              <div 
                ref={setNodeRef}
                className={`bg-gradient-to-br ${column.color} rounded-xl p-4 min-h-[500px] transition-all ${
                  isOver ? 'ring-2 ring-white/50 shadow-lg' : ''
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-white/80">
                      {column.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {column.title}
                    </h3>
                    <Badge variant="secondary" className="ml-2">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </div>
                
                <SortableContext
                  items={columnTasks.map(t => t._id)}
                  strategy={verticalListSortingStrategy}
                  id={column.id}
                >
                  <div className="space-y-2 min-h-[400px]">
                    {columnTasks.map((task) => (
                      <SortableTask
                        key={task._id}
                        task={task}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onAddToCalendar={onAddToCalendar}
                      />
                    ))}
                    
                    {columnTasks.length === 0 && (
                      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <DragOverlay>
        {activeTask && (
          <GlassCard className="p-4 shadow-2xl cursor-grabbing">
            <h4 className="font-medium text-white">{activeTask.title}</h4>
          </GlassCard>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanView; 
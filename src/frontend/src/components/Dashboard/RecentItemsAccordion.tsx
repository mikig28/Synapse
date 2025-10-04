import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Lightbulb, CheckSquare, ExternalLink } from 'lucide-react';
import { NoteItem } from '@/services/notesService';
import { IdeaItem } from '@/services/ideasService';
import { TaskItem } from '@/services/tasksListService';
import { useNavigate } from 'react-router-dom';

interface RecentItemsAccordionProps {
  notes: NoteItem[];
  ideas: IdeaItem[];
  tasks: TaskItem[];
}

const RecentItemsAccordion: React.FC<RecentItemsAccordionProps> = ({
  notes,
  ideas,
  tasks
}) => {
  const navigate = useNavigate();

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <GlassCard className="overflow-hidden border border-border/40">
      <Accordion type="single" collapsible>
        {/* Notes Section */}
        <AccordionItem value="notes" className="border-none">
          <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 text-left">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-semibold">Recent Notes</h3>
              </div>
              <span className="text-xs text-muted-foreground">{notes.length} items</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 sm:px-6 pb-4">
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent notes</p>
              ) : (
                notes.map((note, index) => (
                  <motion.div
                    key={note._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start justify-between p-3 rounded-lg bg-background/60 border border-border/40 hover:bg-background/80 transition-colors cursor-pointer group"
                    onClick={() => navigate('/notes')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {note.title || note.content.slice(0, 60)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </span>
                        {note.source && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {note.source}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                  </motion.div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Ideas Section */}
        <AccordionItem value="ideas" className="border-none">
          <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 text-left">
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-semibold">Recent Ideas</h3>
              </div>
              <span className="text-xs text-muted-foreground">{ideas.length} items</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 sm:px-6 pb-4">
            <div className="space-y-2">
              {ideas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent ideas</p>
              ) : (
                ideas.map((idea, index) => (
                  <motion.div
                    key={idea._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start justify-between p-3 rounded-lg bg-background/60 border border-border/40 hover:bg-background/80 transition-colors cursor-pointer group"
                    onClick={() => navigate('/ideas')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {idea.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(idea.createdAt)}
                        </span>
                        {idea.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">
                            {idea.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                  </motion.div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tasks Section */}
        <AccordionItem value="tasks" className="border-none">
          <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 text-left">
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-semibold">Recent Tasks</h3>
              </div>
              <span className="text-xs text-muted-foreground">{tasks.length} items</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 sm:px-6 pb-4">
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent tasks</p>
              ) : (
                tasks.map((task, index) => (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start justify-between p-3 rounded-lg bg-background/60 border border-border/40 hover:bg-background/80 transition-colors cursor-pointer group"
                    onClick={() => navigate('/tasks')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.completed ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <p className={`text-sm font-medium truncate ${
                          task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                        }`}>
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-4">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(task.createdAt)}
                        </span>
                        {task.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                            task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                  </motion.div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </GlassCard>
  );
};

export default RecentItemsAccordion;

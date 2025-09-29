import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Notebook, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingStore } from '@/store/onboardingStore';
import documentService from '@/services/documentService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const OrganizeContentStep: React.FC = () => {
  const { toast } = useToast();
  const { completeStep, showAchievement, skipStep } = useOnboardingStore();

  const [title, setTitle] = useState('Customer onboarding insights');
  const [content, setContent] = useState('- Capture every question asked this week\n- Tag recurring topics for automation\n- Summarise key blockers for the team call');
  const [tags, setTags] = useState('onboarding, customer success');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreateNote = async () => {
    if (!content.trim()) {
      toast({ variant: 'destructive', title: 'Add some content before saving' });
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const response = await documentService.createDocument({
        title: title.trim() || 'Untitled note',
        content,
        documentType: 'note',
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      completeStep('organize-content');
      showAchievement('Your workspace has its first note. Keep adding context to supercharge AI answers.');
      toast({
        title: 'Note created',
        description: 'You can find it in Documents → Notes.',
      });
      setSuccessMessage(`Saved as “${response.title}”.`);
    } catch (error: any) {
      console.error('Failed to create note', error);
      const message = error?.response?.data?.message || error?.message || 'We could not save that note.';
      toast({ variant: 'destructive', title: 'Save failed', description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Capture your first note</h2>
          <p className="text-sm text-muted-foreground">
            Notes stay in context with your documents and conversations. Start with a quick summary.
          </p>
        </div>
        <Button variant="ghost" onClick={skipStep} className="text-muted-foreground hover:text-foreground">
          Skip for now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Notebook className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="note-title">
                  Title
                </label>
                <Input
                  id="note-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Weekly onboarding review"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="note-tags">
                  Tags
                </label>
                <Input
                  id="note-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="onboarding, follow up"
                />
                <p className="text-xs text-muted-foreground">Separate with commas. Tags help the AI link related content.</p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="note-content">
                  Content
                </label>
                <Textarea
                  id="note-content"
                  rows={6}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Add checklists, recap meetings, capture ideas…"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCreateNote} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save note
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/docs?view=notes', '_blank')}
              >
                Open notes area
              </Button>
            </div>

            {successMessage && (
              <motion.div
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {successMessage}
              </motion.div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};


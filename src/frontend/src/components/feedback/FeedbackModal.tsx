import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import feedbackService, { FeedbackSubmission } from '@/services/feedbackService';
import { 
  X, 
  Send, 
  Bug, 
  Lightbulb, 
  Star, 
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'bug' | 'feature' | 'rating' | null;
}

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', icon: <Bug className="w-4 h-4" />, color: 'text-red-500' },
  { value: 'feature', label: 'Feature Request', icon: <Lightbulb className="w-4 h-4" />, color: 'text-blue-500' },
  { value: 'improvement', label: 'Improvement', icon: <Star className="w-4 h-4" />, color: 'text-yellow-500' },
  { value: 'rating', label: 'Rating', icon: <Star className="w-4 h-4" />, color: 'text-purple-500' },
  { value: 'general', label: 'General Feedback', icon: <MessageCircle className="w-4 h-4" />, color: 'text-gray-500' }
];

const categories = [
  { value: 'ui', label: 'User Interface' },
  { value: 'performance', label: 'Performance' },
  { value: 'functionality', label: 'Functionality' },
  { value: 'content', label: 'Content' },
  { value: 'mobile', label: 'Mobile Experience' },
  { value: 'other', label: 'Other' }
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'high', label: 'High', color: 'bg-red-500/20 text-red-300' },
  { value: 'critical', label: 'Critical', color: 'bg-purple-500/20 text-purple-300' }
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  initialType = null
}) => {
  const [formData, setFormData] = useState<FeedbackSubmission>({
    type: (initialType as any) || 'general',
    category: 'other',
    priority: 'medium',
    title: '',
    description: '',
    steps: '',
    expectedBehavior: '',
    actualBehavior: '',
    email: '',
    rating: 5,
    tags: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Type selection, 2: Details, 3: Confirmation

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: (initialType as any) || 'general',
        category: 'other',
        priority: 'medium',
        title: '',
        description: '',
        steps: '',
        expectedBehavior: '',
        actualBehavior: '',
        email: '',
        rating: 5,
        tags: []
      });
      setStep(initialType ? 2 : 1);
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen, initialType]);

  const templates = feedbackService.getFeedbackTemplates();

  const handleTypeChange = (type: string) => {
    const template = templates[type as keyof typeof templates];
    setFormData(prev => ({
      ...prev,
      type: type as any,
      title: template?.title || '',
      description: template?.description || '',
      steps: template?.steps || '',
      expectedBehavior: template?.expectedBehavior || '',
      actualBehavior: template?.actualBehavior || '',
      category: type === 'bug' ? 'functionality' : 'other',
      priority: type === 'bug' ? 'medium' : 'low'
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Validate
    const validation = feedbackService.validateFeedback(formData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsSubmitting(true);

    try {
      await feedbackService.submitFeedback(formData);
      setSubmitted(true);
      setStep(3);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
            className={`text-2xl transition-colors ${
              star <= (formData.rating || 0) 
                ? 'text-yellow-400 hover:text-yellow-300' 
                : 'text-gray-600 hover:text-gray-500'
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {formData.rating}/5
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="text-2xl">💬</div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {submitted ? 'Thank You!' : 'Share Your Feedback'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {submitted 
                  ? 'Your feedback helps us improve' 
                  : 'Help us make Synapse better for everyone'
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Type Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label className="text-base font-medium">What type of feedback do you have?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => {
                          handleTypeChange(type.value);
                          setStep(2);
                        }}
                        className={`
                          p-4 rounded-lg border transition-all duration-200
                          hover:border-primary/50 hover:bg-muted/50
                          ${formData.type === type.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={type.color}>
                            {type.icon}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-foreground">{type.label}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Details Form */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Error Display */}
                {error && (
                  <Alert className="border-red-500/20 bg-red-500/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-300">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Type Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  {(() => {
                    const type = feedbackTypes.find(t => t.value === formData.type);
                    return type ? (
                      <Badge className="gap-2">
                        <span className={type.color}>{type.icon}</span>
                        {type.label}
                      </Badge>
                    ) : null;
                  })()}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setStep(1)}
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of your feedback"
                    maxLength={200}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.title.length}/200
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Please provide detailed information"
                    rows={4}
                    maxLength={2000}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.description.length}/2000
                  </div>
                </div>

                {/* Rating (for rating type) */}
                {formData.type === 'rating' && (
                  <div className="space-y-2">
                    <Label>How would you rate your experience?</Label>
                    {renderStarRating()}
                  </div>
                )}

                {/* Bug-specific fields */}
                {formData.type === 'bug' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="steps">Steps to Reproduce</Label>
                      <Textarea
                        id="steps"
                        value={formData.steps}
                        onChange={(e) => setFormData(prev => ({ ...prev, steps: e.target.value }))}
                        placeholder="1. Go to...\n2. Click on...\n3. See error"
                        rows={3}
                        maxLength={1000}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expected">Expected Behavior</Label>
                        <Textarea
                          id="expected"
                          value={formData.expectedBehavior}
                          onChange={(e) => setFormData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                          placeholder="What should have happened"
                          rows={2}
                          maxLength={500}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="actual">Actual Behavior</Label>
                        <Textarea
                          id="actual"
                          value={formData.actualBehavior}
                          onChange={(e) => setFormData(prev => ({ ...prev, actualBehavior: e.target.value }))}
                          placeholder="What actually happened"
                          rows={2}
                          maxLength={500}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Category and Priority */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type === 'bug' && (
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <RadioGroup
                        value={formData.priority}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                        className="flex gap-4"
                      >
                        {priorities.map((priority) => (
                          <div key={priority.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={priority.value} id={priority.value} />
                            <Label htmlFor={priority.value} className={`text-xs px-2 py-1 rounded ${priority.color}`}>
                              {priority.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>

                {/* Email for anonymous users */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll only use this to follow up on your feedback
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && submitted && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-6xl"
                >
                  🎉
                </motion.div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Thank You for Your Feedback!
                  </h3>
                  <p className="text-muted-foreground">
                    Your input helps us make Synapse better for everyone. 
                    We'll review your feedback and get back to you if needed.
                  </p>
                </div>

                <motion.div
                  className="flex items-center justify-center gap-2 text-green-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Feedback submitted successfully</span>
                </motion.div>

                <Button onClick={onClose} className="mt-6">
                  Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
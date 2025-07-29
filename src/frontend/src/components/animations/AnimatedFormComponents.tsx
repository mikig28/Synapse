/**
 * Animated Form Components
 * Premium form inputs with delightful interactions and validation feedback
 * Includes floating labels, validation animations, and accessibility features
 */

import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimationContext, useHapticFeedback } from '@/contexts/AnimationContext';
import { 
  springPhysics,
  createTransition,
  successFeedback,
  errorFeedback,
  animationConfig
} from '@/utils/animations';
import { Check, X, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';

// =============================================================================
// ANIMATED INPUT FIELD
// =============================================================================

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  floatingLabel?: boolean;
  showValidationIcon?: boolean;
  validationDelay?: number;
  onValidate?: (value: string) => Promise<string | null>;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ 
    label,
    error,
    success,
    hint,
    icon,
    floatingLabel = true,
    showValidationIcon = true,
    validationDelay = 500,
    onValidate,
    className,
    type = 'text',
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(props.value || props.defaultValue));
    const [isValidating, setIsValidating] = useState(false);
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const [validationState, setValidationState] = useState<'idle' | 'success' | 'error'>('idle');
    const [showPassword, setShowPassword] = useState(false);
    
    const { preferences } = useAnimationContext();
    const haptic = useHapticFeedback();
    const inputRef = useRef<HTMLInputElement>(null);
    const validationTimeoutRef = useRef<NodeJS.Timeout>();
    
    const focusScale = useMotionValue(1);
    const borderColor = useMotionValue('hsl(var(--border))');
    const labelY = useTransform(focusScale, [1, 1.02], [0, -2]);

    // Validation logic
    const validateInput = useCallback(async (value: string) => {
      if (!onValidate) return;
      
      setIsValidating(true);
      
      try {
        const result = await onValidate(value);
        if (result) {
          setValidationMessage(result);
          setValidationState('error');
          borderColor.set('hsl(var(--destructive))');
        } else {
          setValidationMessage(null);
          setValidationState('success');
          borderColor.set('hsl(var(--primary))');
        }
      } catch (error) {
        setValidationMessage('Validation failed');
        setValidationState('error');
        borderColor.set('hsl(var(--destructive))');
      } finally {
        setIsValidating(false);
      }
    }, [onValidate, borderColor]);

    // Handle input changes with debounced validation
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHasValue(Boolean(value));
      props.onChange?.(e);
      
      // Clear previous validation timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      
      // Reset validation state while typing
      if (validationState !== 'idle') {
        setValidationState('idle');
        setValidationMessage(null);
        borderColor.set('hsl(var(--border))');
      }
      
      // Schedule validation
      if (onValidate && value) {
        validationTimeoutRef.current = setTimeout(() => {
          validateInput(value);
        }, validationDelay);
      }
    }, [props.onChange, onValidate, validateInput, validationDelay, validationState, borderColor]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      focusScale.set(1.02);
      borderColor.set('hsl(var(--primary))');
      haptic('light');
      props.onFocus?.(e);
    }, [props.onFocus, focusScale, borderColor, haptic]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      focusScale.set(1);
      
      if (validationState === 'idle') {
        borderColor.set('hsl(var(--border))');
      }
      
      props.onBlur?.(e);
    }, [props.onBlur, focusScale, borderColor, validationState]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
      };
    }, []);

    const isFloating = floatingLabel && (isFocused || hasValue);
    const currentError = error || validationMessage;
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className={cn("relative", className)}>
        {/* Input Container */}
        <motion.div
          className="relative"
          style={{ scale: focusScale }}
          animate={preferences.enableAnimations ? undefined : { scale: 1 }}
        >
          {/* Input Field */}
          <motion.div
            className="relative border rounded-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
            style={{ 
              borderColor: preferences.enableAnimations ? borderColor : undefined,
              boxShadow: isFocused ? '0 0 0 3px hsl(var(--primary) / 0.1)' : undefined
            }}
            animate={
              preferences.enableAnimations && currentError
                ? {
                    x: [-2, 2, -2, 2, 0],
                    transition: { duration: 0.4 }
                  }
                : undefined
            }
          >
            {/* Icon */}
            {icon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                {icon}
              </div>
            )}
            
            {/* Floating Label */}
            {label && floatingLabel && (
              <motion.label
                className={cn(
                  "absolute left-3 text-muted-foreground pointer-events-none transition-all duration-200",
                  icon && "left-10"
                )}
                style={{ y: labelY }}
                animate={
                  preferences.enableAnimations
                    ? {
                        top: isFloating ? '0.5rem' : '50%',
                        fontSize: isFloating ? '0.75rem' : '1rem',
                        y: isFloating ? 0 : '-50%',
                        color: isFocused ? 'hsl(var(--primary))' : undefined,
                      }
                    : undefined
                }
                transition={createTransition(0.2, 'smooth')}
              >
                {label}
              </motion.label>
            )}
            
            <input
              ref={ref || inputRef}
              type={inputType}
              className={cn(
                "w-full px-3 py-3 bg-transparent border-0 outline-none placeholder:text-muted-foreground/50",
                icon && "pl-10",
                (showValidationIcon || isPassword) && "pr-10",
                floatingLabel && label && (isFloating ? "pt-5 pb-1" : "")
              )}
              placeholder={floatingLabel ? undefined : props.placeholder}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              {...props}
            />
            
            {/* Password Toggle / Validation Icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {/* Validation Icon */}
              {showValidationIcon && (
                <AnimatePresence mode="wait">
                  {isValidating ? (
                    <motion.div
                      key="validating"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      className="w-4 h-4"
                    >
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </motion.div>
                  ) : validationState === 'success' ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={springPhysics.bouncy}
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </motion.div>
                  ) : validationState === 'error' ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={springPhysics.bouncy}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
              
              {/* Password Toggle */}
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:bg-muted rounded-sm transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
        
        {/* Static Label (non-floating) */}
        {label && !floatingLabel && (
          <label className="block text-sm font-medium text-foreground mb-2">
            {label}
          </label>
        )}
        
        {/* Messages */}
        <div className="mt-1 min-h-[1.25rem]">
          <AnimatePresence mode="wait">
            {currentError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1 text-sm text-destructive"
              >
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{currentError}</span>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1 text-sm text-green-600"
              >
                <Check className="w-3 h-3 flex-shrink-0" />
                <span>{success}</span>
              </motion.div>
            ) : hint ? (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <Info className="w-3 h-3 flex-shrink-0" />
                <span>{hint}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

// =============================================================================
// ANIMATED TEXTAREA
// =============================================================================

interface AnimatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  floatingLabel?: boolean;
  autoResize?: boolean;
  maxHeight?: number;
}

export const AnimatedTextarea = forwardRef<HTMLTextAreaElement, AnimatedTextareaProps>(
  ({ 
    label,
    error,
    success,
    hint,
    floatingLabel = true,
    autoResize = false,
    maxHeight = 200,
    className,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(props.value || props.defaultValue));
    
    const { preferences } = useAnimationContext();
    const haptic = useHapticFeedback();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const focusScale = useMotionValue(1);
    const borderColor = useMotionValue('hsl(var(--border))');

    // Auto-resize functionality
    const handleResize = useCallback(() => {
      if (!autoResize || !textareaRef.current) return;
      
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }, [autoResize, maxHeight]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setHasValue(Boolean(value));
      props.onChange?.(e);
      handleResize();
    }, [props.onChange, handleResize]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      focusScale.set(1.02);
      borderColor.set('hsl(var(--primary))');
      haptic('light');
      props.onFocus?.(e);
    }, [props.onFocus, focusScale, borderColor, haptic]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      focusScale.set(1);
      borderColor.set('hsl(var(--border))');
      props.onBlur?.(e);
    }, [props.onBlur, focusScale, borderColor]);

    useEffect(() => {
      if (autoResize) {
        handleResize();
      }
    }, [autoResize, handleResize]);

    const isFloating = floatingLabel && (isFocused || hasValue);

    return (
      <div className={cn("relative", className)}>
        {/* Static Label (non-floating) */}
        {label && !floatingLabel && (
          <label className="block text-sm font-medium text-foreground mb-2">
            {label}
          </label>
        )}
        
        {/* Textarea Container */}
        <motion.div
          className="relative"
          style={{ scale: focusScale }}
          animate={preferences.enableAnimations ? undefined : { scale: 1 }}
        >
          <motion.div
            className="relative border rounded-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
            style={{ 
              borderColor: preferences.enableAnimations ? borderColor : undefined,
              boxShadow: isFocused ? '0 0 0 3px hsl(var(--primary) / 0.1)' : undefined
            }}
            animate={
              preferences.enableAnimations && error
                ? {
                    x: [-2, 2, -2, 2, 0],
                    transition: { duration: 0.4 }
                  }
                : undefined
            }
          >
            {/* Floating Label */}
            {label && floatingLabel && (
              <motion.label
                className="absolute left-3 text-muted-foreground pointer-events-none transition-all duration-200"
                animate={
                  preferences.enableAnimations
                    ? {
                        top: isFloating ? '0.5rem' : '0.75rem',
                        fontSize: isFloating ? '0.75rem' : '1rem',
                        color: isFocused ? 'hsl(var(--primary))' : undefined,
                      }
                    : undefined
                }
                transition={createTransition(0.2, 'smooth')}
              >
                {label}
              </motion.label>
            )}
            
            <textarea
              ref={ref || textareaRef}
              className={cn(
                "w-full px-3 py-3 bg-transparent border-0 outline-none placeholder:text-muted-foreground/50 resize-none",
                floatingLabel && label && (isFloating ? "pt-5 pb-1" : ""),
                autoResize && "overflow-hidden"
              )}
              placeholder={floatingLabel ? undefined : props.placeholder}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              style={{
                minHeight: autoResize ? '80px' : undefined,
                maxHeight: autoResize ? `${maxHeight}px` : undefined,
              }}
              {...props}
            />
          </motion.div>
        </motion.div>
        
        {/* Messages */}
        <div className="mt-1 min-h-[1.25rem]">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1 text-sm text-destructive"
              >
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1 text-sm text-green-600"
              >
                <Check className="w-3 h-3 flex-shrink-0" />
                <span>{success}</span>
              </motion.div>
            ) : hint ? (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <Info className="w-3 h-3 flex-shrink-0" />
                <span>{hint}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

AnimatedTextarea.displayName = 'AnimatedTextarea';

// =============================================================================
// ANIMATED FORM WRAPPER
// =============================================================================

interface AnimatedFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  staggerChildren?: boolean;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export const AnimatedForm: React.FC<AnimatedFormProps> = ({
  children,
  onSubmit,
  className,
  staggerChildren = true,
  showProgress = false,
  currentStep = 1,
  totalSteps = 1,
}) => {
  const { preferences } = useAnimationContext();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerChildren && preferences.enableAnimations ? 0.1 : 0,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: createTransition(0.4, 'smooth'),
    },
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.form
      className={cn("space-y-6", className)}
      onSubmit={onSubmit}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Progress Indicator */}
      {showProgress && totalSteps > 1 && (
        <motion.div
          className="mb-8"
          variants={itemVariants}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progressPercentage)}% complete
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}
      
      {/* Form Fields */}
      <motion.div className="space-y-4">
        {React.Children.map(children, (child, index) =>
          React.isValidElement(child) ? (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ) : (
            child
          )
        )}
      </motion.div>
    </motion.form>
  );
};
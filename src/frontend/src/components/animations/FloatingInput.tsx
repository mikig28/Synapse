import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FloatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass';
  showPasswordToggle?: boolean;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  error,
  success,
  helperText,
  size = 'md',
  variant = 'default',
  showPasswordToggle = false,
  type: initialType = 'text',
  className,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const type = showPasswordToggle && initialType === 'password' 
    ? (showPassword ? 'text' : 'password') 
    : initialType;

  useEffect(() => {
    setHasValue(Boolean(value));
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(Boolean(e.target.value));
    onChange?.(e);
  };

  const isLabelFloating = isFocused || hasValue;

  const sizeClasses = {
    sm: {
      input: 'h-10 px-3 text-sm',
      label: 'text-sm',
      icon: 'w-4 h-4'
    },
    md: {
      input: 'h-12 px-4 text-base',
      label: 'text-base',
      icon: 'w-5 h-5'
    },
    lg: {
      input: 'h-14 px-5 text-lg',
      label: 'text-lg',
      icon: 'w-6 h-6'
    }
  };

  const variantClasses = {
    default: cn(
      "border-2 bg-background",
      error ? "border-destructive" : 
      success ? "border-success" :
      isFocused ? "border-primary" : "border-border",
      "focus:outline-none transition-colors duration-200"
    ),
    glass: cn(
      "glass border border-white/20",
      error ? "border-destructive/50" :
      success ? "border-success/50" :
      isFocused ? "border-primary/50" : "border-white/20",
      "focus:outline-none transition-all duration-200"
    )
  };

  return (
    <div className="relative">
      {/* Input container */}
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "w-full rounded-lg transition-all duration-200 peer",
            sizeClasses[size].input,
            variantClasses[variant],
            showPasswordToggle && "pr-12",
            className
          )}
          {...props}
        />

        {/* Floating label */}
        <motion.label
          className={cn(
            "absolute left-4 pointer-events-none transition-all duration-200",
            sizeClasses[size].label,
            error ? "text-destructive" :
            success ? "text-success" :
            isFocused ? "text-primary" : "text-muted-foreground"
          )}
          animate={{
            y: isLabelFloating ? -28 : 0,
            scale: isLabelFloating ? 0.85 : 1,
            x: isLabelFloating ? -2 : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            top: size === 'sm' ? '10px' : size === 'md' ? '12px' : '16px',
            transformOrigin: 'left center'
          }}
        >
          {label}
        </motion.label>

        {/* Background for floating label */}
        <AnimatePresence>
          {isLabelFloating && (
            <motion.div
              className={cn(
                "absolute left-2 h-1 bg-background",
                variant === 'glass' && "bg-background/80"
              )}
              style={{
                top: size === 'sm' ? '-2px' : size === 'md' ? '-2px' : '-2px',
                width: `${label.length * 0.6}em`
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Password toggle */}
        {showPasswordToggle && (
          <motion.button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-200 focus:outline-none"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {showPassword ? (
              <EyeOff className={sizeClasses[size].icon} />
            ) : (
              <Eye className={sizeClasses[size].icon} />
            )}
          </motion.button>
        )}

        {/* Success/Error icons */}
        <AnimatePresence>
          {(success || error) && (
            <motion.div
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                showPasswordToggle && "right-12"
              )}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
            >
              {success && <Check className={cn(sizeClasses[size].icon, "text-success")} />}
              {error && <AlertCircle className={cn(sizeClasses[size].icon, "text-destructive")} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focus ring animation */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            boxShadow: isFocused 
              ? `0 0 0 3px ${
                  error ? 'hsl(var(--destructive) / 0.2)' :
                  success ? 'hsl(var(--success) / 0.2)' :
                  'hsl(var(--primary) / 0.2)'
                }` 
              : 'none'
          }}
          animate={{
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1 : 0.95
          }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Helper text / Error message */}
      <AnimatePresence>
        {(error || helperText) && (
          <motion.div
            className="mt-2 px-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <p className={cn(
              "text-sm",
              error ? "text-destructive" : "text-muted-foreground"
            )}>
              {error || helperText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 
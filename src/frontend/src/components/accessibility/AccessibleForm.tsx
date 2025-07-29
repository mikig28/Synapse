/**
 * Accessible Form Components
 * WCAG 2.1 AA compliant form controls with proper labeling and error handling
 */

import React, { useId, useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

// Error state interface
export interface FormError {
  message: string;
  type?: 'error' | 'warning' | 'info';
  field?: string;
  code?: string;
}

// Validation interface
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

// Base form field props
interface BaseFieldProps {
  id?: string;
  name?: string;
  label: string;
  description?: string;
  error?: FormError;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
}

// Input field props
interface AccessibleInputProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  validation?: ValidationRule;
  onChange?: (value: string, isValid: boolean) => void;
  onBlur?: (value: string, isValid: boolean) => void;
  onValidate?: (value: string) => string | null;
}

// Textarea props
interface AccessibleTextareaProps extends BaseFieldProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  cols?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  autoFocus?: boolean;
  readOnly?: boolean;
  validation?: ValidationRule;
  onChange?: (value: string, isValid: boolean) => void;
  onBlur?: (value: string, isValid: boolean) => void;
  onValidate?: (value: string) => string | null;
}

// Select props
interface AccessibleSelectProps extends BaseFieldProps {
  value?: string;
  defaultValue?: string;
  multiple?: boolean;
  size?: number;
  autoFocus?: boolean;
  validation?: ValidationRule;
  onChange?: (value: string | string[], isValid: boolean) => void;
  onBlur?: (value: string | string[], isValid: boolean) => void;
  children: React.ReactNode;
}

// Checkbox props
interface AccessibleCheckboxProps extends Omit<BaseFieldProps, 'label'> {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  value?: string;
  onChange?: (checked: boolean) => void;
  children: React.ReactNode;
}

// Radio group props
interface AccessibleRadioGroupProps extends BaseFieldProps {
  value?: string;
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  onChange?: (value: string) => void;
  children: React.ReactNode;
}

interface RadioOptionProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}

// Form context
interface FormContextType {
  errors: Map<string, FormError>;
  setError: (fieldName: string, error: FormError | null) => void;
  clearError: (fieldName: string) => void;
  clearAllErrors: () => void;
  isSubmitting: boolean;
  hasErrors: boolean;
}

const FormContext = React.createContext<FormContextType | null>(null);

// Utility functions
const validateField = (value: any, validation?: ValidationRule): string | null => {
  if (!validation) return null;

  if (validation.required && (!value || value.toString().trim() === '')) {
    return validation.message || 'This field is required';
  }

  if (value && validation.minLength && value.toString().length < validation.minLength) {
    return validation.message || `Minimum length is ${validation.minLength} characters`;
  }

  if (value && validation.maxLength && value.toString().length > validation.maxLength) {
    return validation.message || `Maximum length is ${validation.maxLength} characters`;
  }

  if (value && validation.pattern && !validation.pattern.test(value.toString())) {
    return validation.message || 'Invalid format';
  }

  if (validation.custom) {
    return validation.custom(value);
  }

  return null;
};

// Form wrapper component
interface AccessibleFormProps {
  onSubmit?: (data: FormData, isValid: boolean) => void;
  noValidate?: boolean;
  autoComplete?: 'on' | 'off';
  children: React.ReactNode;
  className?: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  onSubmit,
  noValidate = true,
  autoComplete = 'on',
  children,
  className = '',
}) => {
  const [errors, setErrors] = useState<Map<string, FormError>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { screenReader } = useAccessibilityContext();
  const formRef = useRef<HTMLFormElement>(null);

  const setError = useCallback((fieldName: string, error: FormError | null) => {
    setErrors(prev => {
      const newErrors = new Map(prev);
      if (error) {
        newErrors.set(fieldName, error);
      } else {
        newErrors.delete(fieldName);
      }
      return newErrors;
    });
  }, []);

  const clearError = useCallback((fieldName: string) => {
    setError(fieldName, null);
  }, [setError]);

  const clearAllErrors = useCallback(() => {
    setErrors(new Map());
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!onSubmit) return;

    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const hasErrors = errors.size > 0;
    
    if (hasErrors) {
      screenReader.announceError(`Form has ${errors.size} errors. Please correct them before submitting.`);
      
      // Focus first error field
      const firstErrorField = e.currentTarget.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
    } else {
      screenReader.announce('Submitting form...', 'polite');
    }

    try {
      await onSubmit(formData, !hasErrors);
      
      if (!hasErrors) {
        screenReader.announceSuccess('Form submitted successfully');
      }
    } catch (error) {
      screenReader.announceError('Form submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, errors, screenReader]);

  const contextValue: FormContextType = {
    errors,
    setError,
    clearError,
    clearAllErrors,
    isSubmitting,
    hasErrors: errors.size > 0,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate={noValidate}
        autoComplete={autoComplete}
        className={cn('space-y-6', className)}
        aria-label="Form"
      >
        {children}
        
        {/* Error summary for screen readers */}
        {errors.size > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="sr-only"
          >
            Form has {errors.size} error{errors.size > 1 ? 's' : ''}:
            {Array.from(errors.entries()).map(([field, error]) => (
              <div key={field}>
                {field}: {error.message}
              </div>
            ))}
          </div>
        )}
      </form>
    </FormContext.Provider>
  );
};

// Field wrapper component
interface FieldWrapperProps {
  children: React.ReactNode;
  label: string;
  id: string;
  description?: string;
  error?: FormError;
  required?: boolean;
  className?: string;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({
  children,
  label,
  id,
  description,
  error,
  required,
  className = '',
}) => {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      {children}
      
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className={cn(
            'text-sm',
            error.type === 'error' && 'text-destructive',
            error.type === 'warning' && 'text-warning',
            error.type === 'info' && 'text-info'
          )}
        >
          {error.message}
        </div>
      )}
    </div>
  );
};

// Input component
export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(({
  id: providedId,
  name,
  label,
  description,
  error: providedError,
  required,
  disabled,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  autoComplete,
  autoFocus,
  readOnly,
  validation,
  onChange,
  onBlur,
  onValidate,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const formContext = React.useContext(FormContext);
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [hasBlurred, setHasBlurred] = useState(false);
  
  const fieldError = providedError || formContext?.errors.get(name || id);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const validateValue = useCallback((val: string): string | null => {
    if (onValidate) {
      return onValidate(val);
    }
    return validateField(val, validation);
  }, [onValidate, validation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (!isControlled) {
      setInternalValue(newValue);
    }

    // Validate on change if field has been blurred or has an error
    const shouldValidate = hasBlurred || fieldError;
    let isValid = true;
    
    if (shouldValidate) {
      const errorMessage = validateValue(newValue);
      isValid = !errorMessage;
      
      if (formContext && (name || id)) {
        formContext.setError(name || id, errorMessage ? {
          message: errorMessage,
          type: 'error',
          field: name || id,
        } : null);
      }
    }

    onChange?.(newValue, isValid);
  }, [isControlled, hasBlurred, fieldError, validateValue, formContext, name, id, onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHasBlurred(true);
    
    const errorMessage = validateValue(val);
    const isValid = !errorMessage;
    
    if (formContext && (name || id)) {
      formContext.setError(name || id, errorMessage ? {
        message: errorMessage,
        type: 'error',
        field: name || id,
      } : null);
    }

    onBlur?.(val, isValid);
  }, [validateValue, formContext, name, id, onBlur]);

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = fieldError ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId, props['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <FieldWrapper
      label={label}
      id={id}
      description={description}
      error={fieldError}
      required={required}
      className={className}
    >
      <input
        ref={ref}
        id={id}
        name={name || id}
        type={type}
        value={currentValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={fieldError ? 'true' : 'false'}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={props['aria-labelledby']}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          fieldError && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
});

AccessibleInput.displayName = 'AccessibleInput';

// Textarea component
export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(({
  id: providedId,
  name,
  label,
  description,
  error: providedError,
  required,
  disabled,
  value,
  defaultValue,
  placeholder,
  rows = 4,
  cols,
  resize = 'vertical',
  autoFocus,
  readOnly,
  validation,
  onChange,
  onBlur,
  onValidate,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const formContext = React.useContext(FormContext);
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [hasBlurred, setHasBlurred] = useState(false);
  
  const fieldError = providedError || formContext?.errors.get(name || id);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const validateValue = useCallback((val: string): string | null => {
    if (onValidate) {
      return onValidate(val);
    }
    return validateField(val, validation);
  }, [onValidate, validation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (!isControlled) {
      setInternalValue(newValue);
    }

    const shouldValidate = hasBlurred || fieldError;
    let isValid = true;
    
    if (shouldValidate) {
      const errorMessage = validateValue(newValue);
      isValid = !errorMessage;
      
      if (formContext && (name || id)) {
        formContext.setError(name || id, errorMessage ? {
          message: errorMessage,
          type: 'error',
          field: name || id,
        } : null);
      }
    }

    onChange?.(newValue, isValid);
  }, [isControlled, hasBlurred, fieldError, validateValue, formContext, name, id, onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHasBlurred(true);
    
    const errorMessage = validateValue(val);
    const isValid = !errorMessage;
    
    if (formContext && (name || id)) {
      formContext.setError(name || id, errorMessage ? {
        message: errorMessage,
        type: 'error',
        field: name || id,
      } : null);
    }

    onBlur?.(val, isValid);
  }, [validateValue, formContext, name, id, onBlur]);

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = fieldError ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId, props['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <FieldWrapper
      label={label}
      id={id}
      description={description}
      error={fieldError}
      required={required}
      className={className}
    >
      <textarea
        ref={ref}
        id={id}
        name={name || id}
        value={currentValue}
        placeholder={placeholder}
        rows={rows}
        cols={cols}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={fieldError ? 'true' : 'false'}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={props['aria-labelledby']}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          resize === 'none' && 'resize-none',
          resize === 'vertical' && 'resize-y',
          resize === 'horizontal' && 'resize-x',
          resize === 'both' && 'resize',
          fieldError && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
});

AccessibleTextarea.displayName = 'AccessibleTextarea';

// Select component
export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(({
  id: providedId,
  name,
  label,
  description,
  error: providedError,
  required,
  disabled,
  value,
  defaultValue,
  multiple,
  size,
  autoFocus,
  validation,
  onChange,
  onBlur,
  children,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const formContext = React.useContext(FormContext);
  const [hasBlurred, setHasBlurred] = useState(false);
  
  const fieldError = providedError || formContext?.errors.get(name || id);

  const validateValue = useCallback((val: string | string[]): string | null => {
    return validateField(val, validation);
  }, [validation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = multiple 
      ? Array.from(e.target.selectedOptions, option => option.value)
      : e.target.value;
    
    const shouldValidate = hasBlurred || fieldError;
    let isValid = true;
    
    if (shouldValidate) {
      const errorMessage = validateValue(newValue);
      isValid = !errorMessage;
      
      if (formContext && (name || id)) {
        formContext.setError(name || id, errorMessage ? {
          message: errorMessage,
          type: 'error',
          field: name || id,
        } : null);
      }
    }

    onChange?.(newValue, isValid);
  }, [hasBlurred, fieldError, validateValue, formContext, name, id, onChange, multiple]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLSelectElement>) => {
    setHasBlurred(true);
    
    const val = multiple 
      ? Array.from(e.target.selectedOptions, option => option.value)
      : e.target.value;
    
    const errorMessage = validateValue(val);
    const isValid = !errorMessage;
    
    if (formContext && (name || id)) {
      formContext.setError(name || id, errorMessage ? {
        message: errorMessage,
        type: 'error',
        field: name || id,
      } : null);
    }

    onBlur?.(val, isValid);
  }, [validateValue, formContext, name, id, onBlur, multiple]);

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = fieldError ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId, props['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <FieldWrapper
      label={label}
      id={id}
      description={description}
      error={fieldError}
      required={required}
      className={className}
    >
      <select
        ref={ref}
        id={id}
        name={name || id}
        value={value}
        defaultValue={defaultValue}
        multiple={multiple}
        size={size}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        aria-invalid={fieldError ? 'true' : 'false'}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={props['aria-labelledby']}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          multiple && 'h-auto',
          fieldError && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});

AccessibleSelect.displayName = 'AccessibleSelect';

// Checkbox component
export const AccessibleCheckbox = forwardRef<HTMLInputElement, AccessibleCheckboxProps>(({
  id: providedId,
  name,
  description,
  error: providedError,
  required,
  disabled,
  checked,
  defaultChecked,
  indeterminate,
  value,
  onChange,
  children,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const formContext = React.useContext(FormContext);
  const checkboxRef = useRef<HTMLInputElement>(null);
  
  const fieldError = providedError || formContext?.errors.get(name || id);

  // Handle indeterminate state
  useEffect(() => {
    const checkbox = checkboxRef.current || (ref as React.RefObject<HTMLInputElement>)?.current;
    if (checkbox) {
      checkbox.indeterminate = indeterminate || false;
    }
  }, [indeterminate, ref]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  }, [onChange]);

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = fieldError ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId, props['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start space-x-3">
        <input
          ref={ref || checkboxRef}
          id={id}
          name={name || id}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          value={value}
          required={required}
          disabled={disabled}
          aria-invalid={fieldError ? 'true' : 'false'}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={props['aria-labelledby']}
          onChange={handleChange}
          className={cn(
            'h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            fieldError && 'border-destructive',
            className
          )}
          {...props}
        />
        
        <div className="flex flex-col">
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {children}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
          
          {description && (
            <p
              id={descriptionId}
              className="text-sm text-muted-foreground mt-1"
            >
              {description}
            </p>
          )}
        </div>
      </div>
      
      {fieldError && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className={cn(
            'text-sm ml-7',
            fieldError.type === 'error' && 'text-destructive',
            fieldError.type === 'warning' && 'text-warning',
            fieldError.type === 'info' && 'text-info'
          )}
        >
          {fieldError.message}
        </div>
      )}
    </div>
  );
});

AccessibleCheckbox.displayName = 'AccessibleCheckbox';

// Radio group context
const RadioGroupContext = React.createContext<{
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  disabled?: boolean;
} | null>(null);

// Radio group component
export const AccessibleRadioGroup: React.FC<AccessibleRadioGroupProps> = ({
  id: providedId,
  name,
  label,
  description,
  error: providedError,
  required,
  disabled,
  value,
  defaultValue,
  orientation = 'vertical',
  onChange,
  children,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const groupName = name || id;
  const formContext = React.useContext(FormContext);
  
  const fieldError = providedError || formContext?.errors.get(groupName);

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = fieldError ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId, props['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined;

  const contextValue = {
    value,
    onChange,
    name: groupName,
    disabled,
  };

  return (
    <div className={cn('space-y-2', className)}>
      <fieldset>
        <legend className="text-sm font-medium text-foreground">
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </legend>
        
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground mt-1"
          >
            {description}
          </p>
        )}
        
        <RadioGroupContext.Provider value={contextValue}>
          <div
            role="radiogroup"
            aria-describedby={ariaDescribedBy}
            aria-invalid={fieldError ? 'true' : 'false'}
            aria-required={required}
            className={cn(
              'mt-3 space-y-2',
              orientation === 'horizontal' && 'flex space-x-4 space-y-0'
            )}
          >
            {children}
          </div>
        </RadioGroupContext.Provider>
        
        {fieldError && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className={cn(
              'text-sm mt-2',
              fieldError.type === 'error' && 'text-destructive',
              fieldError.type === 'warning' && 'text-warning',
              fieldError.type === 'info' && 'text-info'
            )}
          >
            {fieldError.message}
          </div>
        )}
      </fieldset>
    </div>
  );
};

// Radio option component
export const RadioOption: React.FC<RadioOptionProps> = ({
  value,
  disabled: optionDisabled,
  children,
}) => {
  const context = React.useContext(RadioGroupContext);
  const optionId = useId();
  
  if (!context) {
    throw new Error('RadioOption must be used within AccessibleRadioGroup');
  }

  const { value: groupValue, onChange, name, disabled: groupDisabled } = context;
  const isDisabled = groupDisabled || optionDisabled;
  const isChecked = groupValue === value;

  const handleChange = useCallback(() => {
    if (!isDisabled && onChange) {
      onChange(value);
    }
  }, [isDisabled, onChange, value]);

  return (
    <div className="flex items-center space-x-3">
      <input
        id={optionId}
        name={name}
        type="radio"
        value={value}
        checked={isChecked}
        disabled={isDisabled}
        onChange={handleChange}
        className="h-4 w-4 border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <label
        htmlFor={optionId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {children}
      </label>
    </div>
  );
};

export default AccessibleForm;
/**
 * Descriptive Text Components
 * Alternative descriptions for visual content
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface DescriptiveTextProps {
  children: React.ReactNode;
  level?: 'basic' | 'detailed' | 'comprehensive';
  visuallyHidden?: boolean;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

/**
 * Provides alternative text descriptions for visual content
 * Can be visually hidden or visible based on user preferences
 */
export const DescriptiveText: React.FC<DescriptiveTextProps> = ({
  children,
  level = 'basic',
  visuallyHidden = false,
  as: Component = 'p',
  className
}) => {
  const classes = cn(
    // Base styling
    'text-sm',
    'text-muted-foreground',
    // Level-specific styling
    {
      'text-xs': level === 'basic',
      'text-sm': level === 'detailed', 
      'text-base': level === 'comprehensive'
    },
    // Visual state
    visuallyHidden && 'sr-only',
    className
  );

  return React.createElement(
    Component,
    {
      className: classes,
      'data-description-level': level
    },
    children
  );
};

/**
 * Chart Description Component
 * Provides accessible descriptions for data visualizations
 */
interface ChartDescriptionProps {
  title: string;
  summary: string;
  data: {
    label: string;
    value: string | number;
    description?: string;
  }[];
  trends?: string[];
  visuallyHidden?: boolean;
  className?: string;
}

export const ChartDescription: React.FC<ChartDescriptionProps> = ({
  title,
  summary,
  data,
  trends = [],
  visuallyHidden = false,
  className
}) => {
  return (
    <div 
      className={cn(
        'space-y-2',
        visuallyHidden && 'sr-only',
        className
      )}
      role="img"
      aria-label={`Chart: ${title}`}
    >
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      
      <div>
        <h5 className="font-medium text-xs mb-1">Data Points:</h5>
        <ul className="text-xs text-muted-foreground space-y-1">
          {data.map((item, index) => (
            <li key={index}>
              <strong>{item.label}:</strong> {item.value}
              {item.description && (
                <span className="ml-1">({item.description})</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      
      {trends.length > 0 && (
        <div>
          <h5 className="font-medium text-xs mb-1">Trends:</h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            {trends.map((trend, index) => (
              <li key={index}>{trend}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Image Description Component
 * Provides detailed descriptions for complex images
 */
interface ImageDescriptionProps {
  src: string;
  alt: string;
  longDescription?: string;
  context?: string;
  className?: string;
}

export const ImageDescription: React.FC<ImageDescriptionProps> = ({
  src,
  alt,
  longDescription,
  context,
  className
}) => {
  const descriptionId = React.useId();
  
  return (
    <div className={cn('relative', className)}>
      <img 
        src={src} 
        alt={alt}
        aria-describedby={longDescription ? descriptionId : undefined}
        className="max-w-full h-auto"
      />
      
      {longDescription && (
        <DescriptiveText
          id={descriptionId}
          visuallyHidden={true}
          className="mt-2"
        >
          {context && <span className="font-medium">{context}: </span>}
          {longDescription}
        </DescriptiveText>
      )}
    </div>
  );
};

/**
 * Complex UI Description Component
 * Describes complex interactive elements
 */
interface ComplexUIDescriptionProps {
  element: string;
  state: string;
  instructions: string[];
  shortcuts?: { key: string; action: string }[];
  visuallyHidden?: boolean;
  className?: string;
}

export const ComplexUIDescription: React.FC<ComplexUIDescriptionProps> = ({
  element,
  state,
  instructions,
  shortcuts = [],
  visuallyHidden = false,
  className
}) => {
  return (
    <div 
      className={cn(
        'text-sm space-y-2',
        visuallyHidden && 'sr-only',
        className
      )}
    >
      <div>
        <span className="font-medium">{element}</span>
        <span className="ml-2 text-muted-foreground">({state})</span>
      </div>
      
      <div>
        <p className="font-medium text-xs mb-1">Instructions:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {instructions.map((instruction, index) => (
            <li key={index}>• {instruction}</li>
          ))}
        </ul>
      </div>
      
      {shortcuts.length > 0 && (
        <div>
          <p className="font-medium text-xs mb-1">Keyboard Shortcuts:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {shortcuts.map((shortcut, index) => (
              <li key={index}>
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                  {shortcut.key}
                </kbd>
                <span className="ml-2">{shortcut.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Progress Description Component
 * Describes progress states and completion
 */
interface ProgressDescriptionProps {
  current: number;
  total: number;
  label: string;
  status?: 'in-progress' | 'completed' | 'error' | 'paused';
  eta?: string;
  visuallyHidden?: boolean;
  className?: string;
}

export const ProgressDescription: React.FC<ProgressDescriptionProps> = ({
  current,
  total,
  label,
  status = 'in-progress',
  eta,
  visuallyHidden = false,
  className
}) => {
  const percentage = Math.round((current / total) * 100);
  
  const statusMessages = {
    'in-progress': 'In progress',
    'completed': 'Completed successfully',
    'error': 'Error occurred',
    'paused': 'Paused'
  };
  
  return (
    <div 
      className={cn(
        'text-sm',
        visuallyHidden && 'sr-only',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <p>
        <span className="font-medium">{label}:</span>
        <span className="ml-2">{current} of {total} ({percentage}%)</span>
        <span className="ml-2 text-muted-foreground">
          - {statusMessages[status]}
        </span>
      </p>
      
      {eta && status === 'in-progress' && (
        <p className="text-xs text-muted-foreground mt-1">
          Estimated completion: {eta}
        </p>
      )}
    </div>
  );
};
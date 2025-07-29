/**
 * Screen Reader Only Component
 * Content that is only accessible to screen readers but visually hidden
 * WCAG 2.1 AA Compliant
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  focusable?: boolean;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({ 
  children, 
  as: Component = 'span',
  className,
  focusable = false
}) => {
  const srOnlyClasses = cn(
    // Visually hidden but accessible to screen readers - using standard sr-only pattern
    'absolute w-px h-px p-0 m-[-1px] overflow-hidden whitespace-nowrap border-0',
    // Alternative approach without clip-path for better compatibility
    'sr-only',
    // When focusable, reveal on focus
    focusable && [
      'focus:static',
      'focus:w-auto',
      'focus:h-auto',
      'focus:p-2',
      'focus:m-0',
      'focus:border',
      'focus:overflow-visible',
      'focus:whitespace-normal',
      'focus:bg-background',
      'focus:text-foreground',
      'focus:z-50'
    ],
    className
  );

  return React.createElement(
    Component,
    { 
      className: srOnlyClasses,
      ...(focusable && { tabIndex: 0 })
    },
    children
  );
};

/**
 * Skip Link Component
 * Allows keyboard users to skip to main content sections
 */
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  href, 
  children, 
  className 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const target = document.getElementById(targetId);
    
    if (target) {
      // Make target focusable if it isn't already
      if (!target.tabIndex && target.tabIndex !== 0) {
        target.tabIndex = -1;
      }
      
      target.focus();
      target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        // Hidden by default
        'sr-only',
        // Visible when focused
        'focus:not-sr-only',
        'focus:absolute',
        'focus:top-4',
        'focus:left-4',
        'focus:z-50',
        'focus:px-4',
        'focus:py-2',
        'focus:bg-primary',
        'focus:text-primary-foreground',
        'focus:rounded-md',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary-foreground',
        'focus:ring-offset-2',
        'focus:font-medium',
        'focus:text-sm',
        'focus:no-underline',
        'focus:shadow-lg',
        // High contrast support
        'focus:border-2',
        'focus:border-current',
        className
      )}
    >
      {children}
    </a>
  );
};

/**
 * Live Region Announcer
 * Announces dynamic content changes to screen readers
 */
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  priority = 'polite',
  atomic = true,
  className 
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
      role="status"
    >
      {message}
    </div>
  );
};
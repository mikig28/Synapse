/**
 * Simple Screen Reader Only Component
 * Minimal version without complex CSS classes
 */

import React from 'react';

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  focusable?: boolean;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({ 
  children, 
  as: Component = 'span',
  className = '',
  focusable = false
}) => {
  // Inline styles for screen reader only content (more reliable than CSS classes)
  const srOnlyStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
    ...(focusable && {
      // Make visible when focused
      ':focus': {
        position: 'static',
        width: 'auto',
        height: 'auto',
        padding: '0.5rem',
        margin: '0',
        overflow: 'visible',
        clip: 'auto',
        whiteSpace: 'normal',
        border: '1px solid',
        backgroundColor: 'white',
        color: 'black',
        zIndex: 50
      }
    })
  };

  return React.createElement(
    Component,
    { 
      style: srOnlyStyle,
      className,
      ...(focusable && { tabIndex: 0 }),
      'aria-hidden': false
    },
    children
  );
};

export const SkipLink: React.FC<{ href: string; children: React.ReactNode; className?: string }> = ({ 
  href, 
  children, 
  className = '' 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const target = document.getElementById(targetId);
    
    if (target) {
      if (!target.tabIndex && target.tabIndex !== 0) {
        target.tabIndex = -1;
      }
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    top: '-40px',
    left: '6px',
    background: '#000',
    color: '#fff',
    padding: '8px',
    textDecoration: 'none',
    borderRadius: '4px',
    zIndex: 1000,
    opacity: 0,
    transition: 'opacity 0.3s'
  };

  const focusStyle: React.CSSProperties = {
    ...style,
    opacity: 1,
    top: '6px'
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      style={style}
      className={className}
      onFocus={(e) => Object.assign(e.target.style, focusStyle)}
      onBlur={(e) => Object.assign(e.target.style, style)}
    >
      {children}
    </a>
  );
};

export const LiveRegion: React.FC<{ 
  message: string; 
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}> = ({ 
  message, 
  priority = 'polite',
  atomic = true,
  className = ''
}) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0'
  };

  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      style={style}
      className={className}
      role="status"
    >
      {message}
    </div>
  );
};

export default ScreenReaderOnly;
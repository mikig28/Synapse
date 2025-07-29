/**
 * Enhanced Design System for AI Agents
 * Premium color psychology, typography scales, and animation variants
 */

// Enhanced Color Psychology System for Agent Status
export const agentColors = {
  // Running - Vibrant emerald with energy
  running: {
    primary: 'rgb(16, 185, 129)', // emerald-500
    light: 'rgb(52, 211, 153)', // emerald-400
    dark: 'rgb(5, 150, 105)', // emerald-600
    bg: 'rgb(236, 253, 245)', // emerald-50
    bgDark: 'rgba(16, 185, 129, 0.1)',
    border: 'rgb(167, 243, 208)', // emerald-200
    text: 'rgb(6, 78, 59)', // emerald-900
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  // Idle - Calm indigo with gentle presence
  idle: {
    primary: 'rgb(99, 102, 241)', // indigo-500
    light: 'rgb(129, 140, 248)', // indigo-400
    dark: 'rgb(79, 70, 229)', // indigo-600
    bg: 'rgb(238, 242, 255)', // indigo-50
    bgDark: 'rgba(99, 102, 241, 0.1)',
    border: 'rgb(199, 210, 254)', // indigo-200
    text: 'rgb(54, 47, 120)', // indigo-900
    glow: 'rgba(99, 102, 241, 0.3)',
  },
  // Error - Clear red with attention
  error: {
    primary: 'rgb(239, 68, 68)', // red-500
    light: 'rgb(248, 113, 113)', // red-400
    dark: 'rgb(220, 38, 38)', // red-600
    bg: 'rgb(254, 242, 242)', // red-50
    bgDark: 'rgba(239, 68, 68, 0.1)',
    border: 'rgb(254, 202, 202)', // red-200
    text: 'rgb(127, 29, 29)', // red-900
    glow: 'rgba(239, 68, 68, 0.3)',
  },
  // Completed - Warm amber with celebration
  completed: {
    primary: 'rgb(245, 158, 11)', // amber-500
    light: 'rgb(251, 191, 36)', // amber-400
    dark: 'rgb(217, 119, 6)', // amber-600
    bg: 'rgb(255, 251, 235)', // amber-50
    bgDark: 'rgba(245, 158, 11, 0.1)',
    border: 'rgb(253, 230, 138)', // amber-200
    text: 'rgb(146, 64, 14)', // amber-900
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  // Paused - Neutral gray with subtle presence
  paused: {
    primary: 'rgb(107, 114, 128)', // gray-500
    light: 'rgb(156, 163, 175)', // gray-400
    dark: 'rgb(75, 85, 99)', // gray-600
    bg: 'rgb(249, 250, 251)', // gray-50
    bgDark: 'rgba(107, 114, 128, 0.1)',
    border: 'rgb(229, 231, 235)', // gray-200
    text: 'rgb(17, 24, 39)', // gray-900
    glow: 'rgba(107, 114, 128, 0.2)',
  },
  // Warning - Orange with caution
  warning: {
    primary: 'rgb(249, 115, 22)', // orange-500
    light: 'rgb(251, 146, 60)', // orange-400
    dark: 'rgb(234, 88, 12)', // orange-600
    bg: 'rgb(255, 247, 237)', // orange-50
    bgDark: 'rgba(249, 115, 22, 0.1)',
    border: 'rgb(254, 215, 170)', // orange-200
    text: 'rgb(124, 45, 18)', // orange-900
    glow: 'rgba(249, 115, 22, 0.3)',
  },
} as const;

// Agent Type Colors
export const agentTypeColors = {
  twitter: {
    primary: 'rgb(29, 161, 242)', // Twitter blue
    bg: 'rgb(240, 249, 255)',
    bgDark: 'rgba(29, 161, 242, 0.1)',
    icon: 'rgb(29, 161, 242)',
  },
  news: {
    primary: 'rgb(239, 68, 68)', // News red
    bg: 'rgb(254, 242, 242)',
    bgDark: 'rgba(239, 68, 68, 0.1)',
    icon: 'rgb(239, 68, 68)',
  },
  crewai_news: {
    primary: 'rgb(147, 51, 234)', // Purple for CrewAI
    bg: 'rgb(250, 245, 255)',
    bgDark: 'rgba(147, 51, 234, 0.1)',
    icon: 'rgb(147, 51, 234)',
  },
  custom: {
    primary: 'rgb(16, 185, 129)', // Emerald for custom
    bg: 'rgb(236, 253, 245)',
    bgDark: 'rgba(16, 185, 129, 0.1)',
    icon: 'rgb(16, 185, 129)',
  },
} as const;

// Typography Scale with Professional Hierarchy
export const typography = {
  // Hero titles
  hero: {
    fontSize: '2.25rem', // 36px
    lineHeight: '2.5rem', // 40px
    fontWeight: '800',
    letterSpacing: '-0.025em',
  },
  // Page titles
  title: {
    fontSize: '1.875rem', // 30px
    lineHeight: '2.25rem', // 36px
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  // Section headings
  heading: {
    fontSize: '1.5rem', // 24px
    lineHeight: '2rem', // 32px
    fontWeight: '600',
    letterSpacing: '-0.025em',
  },
  // Card titles
  cardTitle: {
    fontSize: '1.125rem', // 18px
    lineHeight: '1.75rem', // 28px
    fontWeight: '600',
    letterSpacing: '-0.025em',
  },
  // Body text
  body: {
    fontSize: '0.875rem', // 14px
    lineHeight: '1.25rem', // 20px
    fontWeight: '400',
  },
  // Small text
  small: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1rem', // 16px
    fontWeight: '400',
  },
  // Captions
  caption: {
    fontSize: '0.6875rem', // 11px
    lineHeight: '0.875rem', // 14px
    fontWeight: '500',
    letterSpacing: '0.025em',
    textTransform: 'uppercase' as const,
  },
  // Tabular numbers for metrics
  metric: {
    fontSize: '1.25rem', // 20px
    lineHeight: '1.75rem', // 28px
    fontWeight: '700',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.025em',
  },
} as const;

// Professional Spacing Scale
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
} as const;

// Border Radius System
export const borderRadius = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// Shadow System for Depth
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  glow: (color: string) => `0 0 20px ${color}`,
  coloredGlow: (color: string) => `0 4px 20px ${color}, 0 0 40px ${color}`,
} as const;

// Get agent status color helper
export const getAgentStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return agentColors.running;
    case 'idle':
      return agentColors.idle;
    case 'error':
      return agentColors.error;
    case 'completed':
      return agentColors.completed;
    case 'paused':
      return agentColors.paused;
    default:
      return agentColors.idle;
  }
};

// Get agent type color helper
export const getAgentTypeColor = (type: string) => {
  switch (type) {
    case 'twitter':
      return agentTypeColors.twitter;
    case 'news':
      return agentTypeColors.news;
    case 'crewai_news':
      return agentTypeColors.crewai_news;
    case 'custom':
      return agentTypeColors.custom;
    default:
      return agentTypeColors.custom;
  }
};

// Responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Professional color palette
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
} as const;
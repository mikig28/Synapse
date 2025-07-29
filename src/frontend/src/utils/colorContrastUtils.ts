/**
 * Color Contrast Utilities
 * WCAG 2.1 AA compliant color contrast validation and enhancement
 */

// WCAG contrast ratio requirements
export const WCAG_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

// Color format interfaces
export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}

export interface ColorContrastResult {
  ratio: number;
  isAccessible: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
  recommendations?: string[];
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

// Color parsing utilities
export const parseColor = (color: string): RGBColor | null => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Handle hsl/hsla colors
  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([0-9.]+))?\)/);
  if (hslMatch) {
    const hsl: HSLColor = {
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3]),
      a: hslMatch[4] ? parseFloat(hslMatch[4]) : 1,
    };
    return hslToRgb(hsl);
  }

  // Handle named colors (common ones)
  const namedColors: Record<string, RGBColor> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
  };

  const lowerColor = color.toLowerCase();
  if (lowerColor in namedColors) {
    return namedColors[lowerColor];
  }

  return null;
};

// Color conversion utilities
export const hslToRgb = (hsl: HSLColor): RGBColor => {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsl.a,
  };
};

export const rgbToHsl = (rgb: RGBColor): HSLColor => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  const l = sum / 2;

  let h = 0;
  let s = 0;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum;

    switch (max) {
      case r:
        h = ((g - b) / diff) + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: rgb.a,
  };
};

// Luminance calculation
export const getRelativeLuminance = (color: RGBColor): number => {
  const sRGB = [color.r, color.g, color.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

// Contrast ratio calculation
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// WCAG compliance check
export const checkContrastCompliance = (
  foreground: string,
  background: string,
  isLargeText = false,
  targetLevel: 'AA' | 'AAA' = 'AA'
): ColorContrastResult => {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = targetLevel === 'AAA' 
    ? (isLargeText ? WCAG_RATIOS.AAA_LARGE : WCAG_RATIOS.AAA_NORMAL)
    : (isLargeText ? WCAG_RATIOS.AA_LARGE : WCAG_RATIOS.AA_NORMAL);

  const isAccessible = ratio >= requiredRatio;
  const level = ratio >= WCAG_RATIOS.AAA_NORMAL || (isLargeText && ratio >= WCAG_RATIOS.AAA_LARGE) 
    ? 'AAA' 
    : ratio >= WCAG_RATIOS.AA_NORMAL || (isLargeText && ratio >= WCAG_RATIOS.AA_LARGE)
    ? 'AA'
    : 'FAIL';

  const recommendations: string[] = [];
  if (!isAccessible) {
    recommendations.push(`Current ratio: ${ratio.toFixed(2)}, Required: ${requiredRatio.toFixed(2)}`);
    
    if (ratio < WCAG_RATIOS.AA_LARGE) {
      recommendations.push('Consider using larger text size or adjusting colors');
    }
    
    recommendations.push('Try darkening the text or lightening the background');
    recommendations.push('Consider using a color contrast tool to find compliant colors');
  }

  return {
    ratio,
    isAccessible,
    level,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
};

// Color adjustment utilities
export const adjustColorLuminance = (color: string, amount: number): string => {
  const rgb = parseColor(color);
  if (!rgb) return color;

  const hsl = rgbToHsl(rgb);
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));

  const newRgb = hslToRgb(hsl);
  return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
};

export const findAccessibleColor = (
  baseColor: string,
  backgroundColors: string[],
  isLargeText = false,
  targetLevel: 'AA' | 'AAA' = 'AA'
): string | null => {
  // Try the base color first
  for (const bg of backgroundColors) {
    const result = checkContrastCompliance(baseColor, bg, isLargeText, targetLevel);
    if (result.isAccessible) {
      return baseColor;
    }
  }

  // Try adjusting luminance
  const rgb = parseColor(baseColor);
  if (!rgb) return null;

  const hsl = rgbToHsl(rgb);
  const originalL = hsl.l;

  // Try darker versions
  for (let adjustment = -5; adjustment >= -80; adjustment -= 5) {
    hsl.l = Math.max(0, originalL + adjustment);
    const testColor = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    
    for (const bg of backgroundColors) {
      const result = checkContrastCompliance(testColor, bg, isLargeText, targetLevel);
      if (result.isAccessible) {
        return testColor;
      }
    }
  }

  // Try lighter versions
  hsl.l = originalL;
  for (let adjustment = 5; adjustment <= 80; adjustment += 5) {
    hsl.l = Math.min(100, originalL + adjustment);
    const testColor = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    
    for (const bg of backgroundColors) {
      const result = checkContrastCompliance(testColor, bg, isLargeText, targetLevel);
      if (result.isAccessible) {
        return testColor;
      }
    }
  }

  return null;
};

// Generate accessible color palette
export const generateAccessiblePalette = (
  baseColors: Partial<ColorScheme>,
  targetLevel: 'AA' | 'AAA' = 'AA'
): ColorScheme => {
  const defaultPalette: ColorScheme = {
    primary: '#3b82f6',
    secondary: '#6b7280',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  };

  const palette = { ...defaultPalette, ...baseColors };
  const backgrounds = [palette.background, palette.surface];

  // Ensure text colors have good contrast
  const accessibleText = findAccessibleColor(palette.text, backgrounds, false, targetLevel);
  if (accessibleText) palette.text = accessibleText;

  const accessibleTextSecondary = findAccessibleColor(palette.textSecondary, backgrounds, false, targetLevel);
  if (accessibleTextSecondary) palette.textSecondary = accessibleTextSecondary;

  // Ensure interactive colors have good contrast
  const accessiblePrimary = findAccessibleColor(palette.primary, backgrounds, false, targetLevel);
  if (accessiblePrimary) palette.primary = accessiblePrimary;

  const accessibleError = findAccessibleColor(palette.error, backgrounds, false, targetLevel);
  if (accessibleError) palette.error = accessibleError;

  const accessibleWarning = findAccessibleColor(palette.warning, backgrounds, false, targetLevel);
  if (accessibleWarning) palette.warning = accessibleWarning;

  const accessibleSuccess = findAccessibleColor(palette.success, backgrounds, false, targetLevel);
  if (accessibleSuccess) palette.success = accessibleSuccess;

  return palette;
};

// DOM audit utilities
export interface ContrastAuditResult {
  element: HTMLElement;
  foreground: string;
  background: string;
  ratio: number;
  isAccessible: boolean;
  isLargeText: boolean;
  recommendations: string[];
  selector: string;
}

export const auditPageContrast = (targetLevel: 'AA' | 'AAA' = 'AA'): ContrastAuditResult[] => {
  const results: ContrastAuditResult[] = [];
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label, input, textarea, select, li, td, th');

  textElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const computed = getComputedStyle(htmlElement);
    
    const foreground = computed.color;
    const background = getEffectiveBackgroundColor(htmlElement);
    
    if (!foreground || !background || background === 'rgba(0, 0, 0, 0)') {
      return;
    }

    const fontSize = parseFloat(computed.fontSize);
    const fontWeight = computed.fontWeight;
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));

    const result = checkContrastCompliance(foreground, background, isLargeText, targetLevel);
    
    if (!result.isAccessible) {
      results.push({
        element: htmlElement,
        foreground,
        background,
        ratio: result.ratio,
        isAccessible: result.isAccessible,
        isLargeText,
        recommendations: result.recommendations || [],
        selector: getElementSelector(htmlElement),
      });
    }
  });

  return results;
};

// Get effective background color (considering transparency and inheritance)
const getEffectiveBackgroundColor = (element: HTMLElement): string => {
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    const computed = getComputedStyle(current);
    const bgColor = computed.backgroundColor;
    
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      const rgb = parseColor(bgColor);
      if (rgb && (rgb.a === undefined || rgb.a > 0)) {
        return bgColor;
      }
    }
    
    current = current.parentElement;
  }
  
  return 'rgb(255, 255, 255)'; // Default to white
};

// Generate element selector for CSS targeting
const getElementSelector = (element: HTMLElement): string => {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const tagName = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).join('.');
  
  if (classes) {
    return `${tagName}.${classes}`;
  }
  
  // Generate a more specific selector
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    return `${getElementSelector(parent)} > ${tagName}:nth-child(${index + 1})`;
  }
  
  return tagName;
};

// High contrast mode utilities
export const isHighContrastMode = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

export const isReducedMotionPreferred = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isDarkModePreferred = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// CSS custom properties for dynamic theming
export const setCSSCustomProperties = (palette: ColorScheme): void => {
  const root = document.documentElement;
  
  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
};

// Export utility functions for components
export const colorContrastUtils = {
  parseColor,
  getContrastRatio,
  checkContrastCompliance,
  findAccessibleColor,
  generateAccessiblePalette,
  auditPageContrast,
  adjustColorLuminance,
  setCSSCustomProperties,
  isHighContrastMode,
  isReducedMotionPreferred,
  isDarkModePreferred,
};
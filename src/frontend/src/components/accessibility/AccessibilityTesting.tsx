/**
 * Accessibility Testing Utilities
 * Comprehensive WCAG 2.1 AA compliance testing and validation tools
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { auditPageContrast, colorContrastUtils } from '@/utils/colorContrastUtils';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Keyboard,
  MousePointer,
  Volume2,
  Monitor,
  Settings,
  Play,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Info,
  Warning,
  ZapOff,
} from 'lucide-react';

// Test result interfaces
export interface AccessibilityTestResult {
  id: string;
  category: 'keyboard' | 'screen-reader' | 'color-contrast' | 'focus-management' | 'aria' | 'structure';
  severity: 'error' | 'warning' | 'info' | 'pass';
  wcagLevel: 'A' | 'AA' | 'AAA';
  principle: 'perceivable' | 'operable' | 'understandable' | 'robust';
  rule: string;
  description: string;
  element?: HTMLElement;
  selector?: string;
  recommendation: string;
  helpUrl?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: AccessibilityTest[];
  enabled: boolean;
}

export interface AccessibilityTest {
  id: string;
  name: string;
  description: string;
  category: AccessibilityTestResult['category'];
  severity: AccessibilityTestResult['severity'];
  wcagLevel: AccessibilityTestResult['wcagLevel'];
  principle: AccessibilityTestResult['principle'];
  run: () => Promise<AccessibilityTestResult[]>;
}

interface AccessibilityTestingProps {
  autoRun?: boolean;
  showPassed?: boolean;
  targetLevel?: 'A' | 'AA' | 'AAA';
  onResultsChange?: (results: AccessibilityTestResult[]) => void;
}

export const AccessibilityTesting: React.FC<AccessibilityTestingProps> = ({
  autoRun = false,
  showPassed = false,
  targetLevel = 'AA',
  onResultsChange,
}) => {
  const { settings, screenReader, runAccessibilityCheck } = useAccessibilityContext();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AccessibilityTestResult[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedSuites, setSelectedSuites] = useState<Set<string>>(new Set(['basic', 'wcag-aa']));
  
  const testContainerRef = useRef<HTMLDivElement>(null);

  // Define test suites
  const testSuites: TestSuite[] = [
    {
      id: 'basic',
      name: 'Basic Accessibility',
      description: 'Fundamental accessibility requirements',
      enabled: true,
      tests: [
        {
          id: 'missing-alt-text',
          name: 'Missing Alt Text',
          description: 'Images must have alternative text',
          category: 'aria',
          severity: 'error',
          wcagLevel: 'A',
          principle: 'perceivable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const images = document.querySelectorAll('img:not([alt])');
            
            images.forEach((img, index) => {
              results.push({
                id: `missing-alt-${index}`,
                category: 'aria',
                severity: 'error',
                wcagLevel: 'A',
                principle: 'perceivable',
                rule: 'WCAG 1.1.1 Non-text Content',
                description: 'Image is missing alt attribute',
                element: img as HTMLElement,
                selector: getElementSelector(img as HTMLElement),
                recommendation: 'Add descriptive alt text or alt="" for decorative images',
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
              });
            });
            
            return results;
          },
        },
        {
          id: 'missing-form-labels',
          name: 'Missing Form Labels',
          description: 'Form inputs must have associated labels',
          category: 'aria',
          severity: 'error',
          wcagLevel: 'A',
          principle: 'perceivable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const inputs = document.querySelectorAll('input, select, textarea');
            
            inputs.forEach((input, index) => {
              const hasLabel = input.hasAttribute('aria-label') || 
                              input.hasAttribute('aria-labelledby') ||
                              document.querySelector(`label[for="${input.id}"]`);
              
              if (!hasLabel) {
                results.push({
                  id: `missing-label-${index}`,
                  category: 'aria',
                  severity: 'error',
                  wcagLevel: 'A',
                  principle: 'perceivable',
                  rule: 'WCAG 1.3.1 Info and Relationships',
                  description: 'Form input is missing a label',
                  element: input as HTMLElement,
                  selector: getElementSelector(input as HTMLElement),
                  recommendation: 'Add a label element or aria-label attribute',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
                });
              }
            });
            
            return results;
          },
        },
        {
          id: 'keyboard-focus',
          name: 'Keyboard Focus',
          description: 'Interactive elements must be keyboard accessible',
          category: 'keyboard',
          severity: 'error',
          wcagLevel: 'A',
          principle: 'operable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const interactiveElements = document.querySelectorAll(
              'button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            interactiveElements.forEach((element, index) => {
              const tabIndex = (element as HTMLElement).tabIndex;
              
              if (tabIndex < 0 && element.getAttribute('tabindex') !== '-1') {
                results.push({
                  id: `keyboard-focus-${index}`,
                  category: 'keyboard',
                  severity: 'warning',
                  wcagLevel: 'A',
                  principle: 'operable',
                  rule: 'WCAG 2.1.1 Keyboard',
                  description: 'Interactive element may not be keyboard accessible',
                  element: element as HTMLElement,
                  selector: getElementSelector(element as HTMLElement),
                  recommendation: 'Ensure element is focusable with keyboard',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
                });
              }
            });
            
            return results;
          },
        },
      ],
    },
    {
      id: 'wcag-aa',
      name: 'WCAG AA Compliance',
      description: 'WCAG 2.1 AA level requirements',
      enabled: true,
      tests: [
        {
          id: 'color-contrast',
          name: 'Color Contrast',
          description: 'Text must have sufficient contrast',
          category: 'color-contrast',
          severity: 'error',
          wcagLevel: 'AA',
          principle: 'perceivable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const contrastResults = auditPageContrast('AA');
            
            contrastResults.forEach((result, index) => {
              results.push({
                id: `color-contrast-${index}`,
                category: 'color-contrast',
                severity: 'error',
                wcagLevel: 'AA',
                principle: 'perceivable',
                rule: 'WCAG 1.4.3 Contrast (Minimum)',
                description: `Text contrast ratio ${result.ratio.toFixed(2)}:1 is below required ${result.isLargeText ? '3:1' : '4.5:1'}`,
                element: result.element,
                selector: result.selector,
                recommendation: result.recommendations.join('; '),
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
              });
            });
            
            return results;
          },
        },
        {
          id: 'focus-indicators',
          name: 'Focus Indicators',
          description: 'Focus indicators must be visible',
          category: 'focus-management',
          severity: 'error',
          wcagLevel: 'AA',
          principle: 'operable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const focusableElements = document.querySelectorAll(
              'button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            // This is a simplified check - in practice, you'd need to test actual focus styles
            focusableElements.forEach((element, index) => {
              const styles = getComputedStyle(element as HTMLElement);
              const hasOutline = styles.outline !== 'none' && styles.outline !== '0px';
              const hasBoxShadow = styles.boxShadow !== 'none';
              
              if (!hasOutline && !hasBoxShadow) {
                results.push({
                  id: `focus-indicator-${index}`,
                  category: 'focus-management',
                  severity: 'warning',
                  wcagLevel: 'AA',
                  principle: 'operable',
                  rule: 'WCAG 2.4.7 Focus Visible',
                  description: 'Element may not have visible focus indicator',
                  element: element as HTMLElement,
                  selector: getElementSelector(element as HTMLElement),
                  recommendation: 'Add visible focus indicator with outline or box-shadow',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
                });
              }
            });
            
            return results;
          },
        },
        {
          id: 'heading-structure',
          name: 'Heading Structure',
          description: 'Headings must be properly structured',
          category: 'structure',
          severity: 'warning',
          wcagLevel: 'AA',
          principle: 'perceivable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let previousLevel = 0;
            
            headings.forEach((heading, index) => {
              const level = parseInt(heading.tagName.charAt(1));
              
              if (index === 0 && level !== 1) {
                results.push({
                  id: `heading-structure-first-${index}`,
                  category: 'structure',
                  severity: 'warning',
                  wcagLevel: 'AA',
                  principle: 'perceivable',
                  rule: 'WCAG 1.3.1 Info and Relationships',
                  description: 'Page should start with h1 heading',
                  element: heading as HTMLElement,
                  selector: getElementSelector(heading as HTMLElement),
                  recommendation: 'Use h1 for the main page heading',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
                });
              }
              
              if (level > previousLevel + 1) {
                results.push({
                  id: `heading-structure-skip-${index}`,
                  category: 'structure',
                  severity: 'warning',
                  wcagLevel: 'AA',
                  principle: 'perceivable',
                  rule: 'WCAG 1.3.1 Info and Relationships',
                  description: `Heading level skipped from h${previousLevel} to h${level}`,
                  element: heading as HTMLElement,
                  selector: getElementSelector(heading as HTMLElement),
                  recommendation: 'Use sequential heading levels',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
                });
              }
              
              previousLevel = level;
            });
            
            return results;
          },
        },
      ],
    },
    {
      id: 'advanced',
      name: 'Advanced Tests',
      description: 'Advanced accessibility patterns and best practices',
      enabled: false,
      tests: [
        {
          id: 'aria-roles',
          name: 'ARIA Roles',
          description: 'ARIA roles must be valid and properly used',
          category: 'aria',
          severity: 'error',
          wcagLevel: 'A',
          principle: 'robust',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const elementsWithRoles = document.querySelectorAll('[role]');
            
            const validRoles = [
              'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
              'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
              'contentinfo', 'dialog', 'document', 'feed', 'figure', 'form',
              'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list',
              'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
              'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
              'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
              'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader',
              'scrollbar', 'search', 'searchbox', 'separator', 'slider',
              'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
              'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
              'tree', 'treegrid', 'treeitem'
            ];
            
            elementsWithRoles.forEach((element, index) => {
              const role = element.getAttribute('role');
              if (role && !validRoles.includes(role)) {
                results.push({
                  id: `invalid-aria-role-${index}`,
                  category: 'aria',
                  severity: 'error',
                  wcagLevel: 'A',
                  principle: 'robust',
                  rule: 'WCAG 4.1.2 Name, Role, Value',
                  description: `Invalid ARIA role: ${role}`,
                  element: element as HTMLElement,
                  selector: getElementSelector(element as HTMLElement),
                  recommendation: 'Use a valid ARIA role or remove the role attribute',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
                });
              }
            });
            
            return results;
          },
        },
        {
          id: 'touch-targets',
          name: 'Touch Target Size',
          description: 'Touch targets must be at least 44x44 pixels',
          category: 'keyboard',
          severity: 'warning',
          wcagLevel: 'AA',
          principle: 'operable',
          run: async () => {
            const results: AccessibilityTestResult[] = [];
            const touchTargets = document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]');
            
            touchTargets.forEach((target, index) => {
              const rect = (target as HTMLElement).getBoundingClientRect();
              const minSize = 44;
              
              if (rect.width < minSize || rect.height < minSize) {
                results.push({
                  id: `touch-target-${index}`,
                  category: 'keyboard',
                  severity: 'warning',
                  wcagLevel: 'AA',
                  principle: 'operable',
                  rule: 'WCAG 2.5.5 Target Size',
                  description: `Touch target is ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px (minimum 44x44px)`,
                  element: target as HTMLElement,
                  selector: getElementSelector(target as HTMLElement),
                  recommendation: 'Increase touch target size to at least 44x44 pixels',
                  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/target-size.html',
                });
              }
            });
            
            return results;
          },
        },
      ],
    }
  ];

  // Run accessibility tests
  const runTests = useCallback(async () => {
    setIsRunning(true);
    const allResults: AccessibilityTestResult[] = [];
    
    try {
      screenReader.announce('Running accessibility tests...', 'polite');
      
      // Run selected test suites
      for (const suite of testSuites) {
        if (selectedSuites.has(suite.id)) {
          for (const test of suite.tests) {
            try {
              const testResults = await test.run();
              allResults.push(...testResults);
            } catch (error) {
              console.error(`Test ${test.id} failed:`, error);
              allResults.push({
                id: `${test.id}-error`,
                category: test.category,
                severity: 'error',
                wcagLevel: test.wcagLevel,
                principle: test.principle,
                rule: 'Test Execution Error',
                description: `Failed to run test: ${test.name}`,
                recommendation: 'Check console for detailed error information',
              });
            }
          }
        }
      }
      
      // Filter by target level
      const filteredResults = allResults.filter(result => {
        const levels = { 'A': 1, 'AA': 2, 'AAA': 3 };
        return levels[result.wcagLevel] <= levels[targetLevel];
      });
      
      setResults(filteredResults);
      onResultsChange?.(filteredResults);
      
      const errorCount = filteredResults.filter(r => r.severity === 'error').length;
      const warningCount = filteredResults.filter(r => r.severity === 'warning').length;
      
      screenReader.announce(
        `Accessibility test completed. Found ${errorCount} errors and ${warningCount} warnings.`,
        'polite'
      );
      
    } catch (error) {
      console.error('Accessibility testing failed:', error);
      screenReader.announceError('Accessibility testing failed');
    } finally {
      setIsRunning(false);
    }
  }, [selectedSuites, targetLevel, onResultsChange, screenReader, testSuites]);

  // Auto-run tests on mount
  useEffect(() => {
    if (autoRun) {
      runTests();
    }
  }, [autoRun, runTests]);

  // Group results by category
  const groupedResults = results.reduce((groups, result) => {
    const category = result.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(result);
    return groups;
  }, {} as Record<string, AccessibilityTestResult[]>);

  // Get category statistics
  const getCategoryStats = (category: string) => {
    const categoryResults = groupedResults[category] || [];
    return {
      total: categoryResults.length,
      errors: categoryResults.filter(r => r.severity === 'error').length,
      warnings: categoryResults.filter(r => r.severity === 'warning').length,
      passed: categoryResults.filter(r => r.severity === 'pass').length,
    };
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Export results
  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      targetLevel,
      summary: {
        total: results.length,
        errors: results.filter(r => r.severity === 'error').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        passed: results.filter(r => r.severity === 'pass').length,
      },
      results: results.map(result => ({
        ...result,
        element: result.element ? getElementSelector(result.element) : undefined,
      })),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    screenReader.announceSuccess('Accessibility report exported');
  };

  // Utility function to get element selector
  function getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    
    const tagName = element.tagName.toLowerCase();
    const classes = Array.from(element.classList).join('.');
    
    if (classes) return `${tagName}.${classes}`;
    
    // Generate a more specific selector
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      return `${getElementSelector(parent)} > ${tagName}:nth-child(${index + 1})`;
    }
    
    return tagName;
  }

  const getSeverityIcon = (severity: AccessibilityTestResult['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getCategoryIcon = (category: AccessibilityTestResult['category']) => {
    switch (category) {
      case 'keyboard':
        return <Keyboard className="w-4 h-4" />;
      case 'screen-reader':
        return <Volume2 className="w-4 h-4" />;
      case 'color-contrast':
        return <Eye className="w-4 h-4" />;
      case 'focus-management':
        return <MousePointer className="w-4 h-4" />;
      case 'aria':
        return <Settings className="w-4 h-4" />;
      case 'structure':
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div ref={testContainerRef} className="space-y-6">
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Accessibility Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Suite Selection */}
          <div>
            <h4 className="font-medium mb-2">Test Suites</h4>
            <div className="space-y-2">
              {testSuites.map(suite => (
                <label key={suite.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedSuites.has(suite.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedSuites);
                      if (e.target.checked) {
                        newSelected.add(suite.id);
                      } else {
                        newSelected.delete(suite.id);
                      }
                      setSelectedSuites(newSelected);
                    }}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium">{suite.name}</span>
                    <p className="text-sm text-muted-foreground">{suite.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={runTests} 
              disabled={isRunning || selectedSuites.size === 0}
              className="flex items-center gap-2"
            >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </Button>
            
            {results.length > 0 && (
              <Button variant="outline" onClick={exportResults} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {results.filter(r => r.severity === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {results.filter(r => r.severity === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {results.filter(r => r.severity === 'info').length}
                </div>
                <div className="text-sm text-muted-foreground">Info</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {results.filter(r => r.severity === 'pass').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {Object.keys(groupedResults).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([category, categoryResults]) => {
            const stats = getCategoryStats(category);
            const isExpanded = expandedCategories.has(category);
            
            return (
              <Card key={category}>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => toggleCategory(category)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category as AccessibilityTestResult['category'])}
                      <span className="capitalize">{category.replace('-', ' ')}</span>
                      <Badge variant="secondary">
                        {stats.total} issue{stats.total !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </CardTitle>
                </CardHeader>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {categoryResults.map((result, index) => (
                            <div 
                              key={result.id}
                              className="border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  {getSeverityIcon(result.severity)}
                                  <span className="font-medium">{result.rule}</span>
                                  <Badge variant="outline" className="text-xs">
                                    WCAG {result.wcagLevel}
                                  </Badge>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">
                                {result.description}
                              </p>
                              
                              {result.selector && (
                                <div className="text-xs font-mono bg-muted p-2 rounded">
                                  {result.selector}
                                </div>
                              )}
                              
                              <div className="text-sm">
                                <strong>Recommendation:</strong> {result.recommendation}
                              </div>
                              
                              {result.helpUrl && (
                                <a 
                                  href={result.helpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-500 hover:underline"
                                >
                                  Learn more →
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* No results message */}
      {!isRunning && results.length === 0 && selectedSuites.size > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">No accessibility issues found!</p>
            <p className="text-muted-foreground">
              All selected tests passed for WCAG {targetLevel} compliance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccessibilityTesting;
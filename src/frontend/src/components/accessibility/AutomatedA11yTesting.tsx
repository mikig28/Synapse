/**
 * Automated Accessibility Testing Component
 * Integrates axe-core for automated WCAG 2.1 AA compliance testing
 * WCAG 2.1 AA Compliant
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';
import axeCore from 'axe-core';
import {
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Download,
  Settings,
  Eye,
  Keyboard,
  Volume2,
  Monitor,
  Zap,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

// Configure axe-core
axeCore.configure({
  branding: {
    brand: 'WCAG 2.1 AA Compliance',
    application: 'Synapse AI Agents'
  },
  reporter: 'v2'
});

interface AxeResult {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
}

interface AxeResults {
  violations: AxeResult[];
  passes: AxeResult[];
  incomplete: AxeResult[];
  inapplicable: AxeResult[];
  timestamp: string;
  url: string;
}

interface AutomatedA11yTestingProps {
  autoRun?: boolean;
  target?: string | Element | null;
  rules?: string[];
  tags?: string[];
  onResultsChange?: (results: AxeResults) => void;
  showPassed?: boolean;
  className?: string;
}

export const AutomatedA11yTesting: React.FC<AutomatedA11yTestingProps> = ({
  autoRun = false,
  target = document,
  rules,
  tags = ['wcag2a', 'wcag2aa', 'wcag21aa'],
  onResultsChange,
  showPassed = false,
  className
}) => {
  const { settings, screenReader } = useAccessibilityContext();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AxeResults | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [liveMode, setLiveMode] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const testId = React.useId();

  // Run accessibility audit
  const runAudit = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    
    try {
      screenReader.announce('Starting accessibility audit...', 'polite');
      
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const axeConfig = {
        tags,
        rules: rules?.reduce((acc, rule) => {
          acc[rule] = { enabled: true };
          return acc;
        }, {} as Record<string, { enabled: boolean }>),
      };

      const axeResults = await axeCore.run(target as any, axeConfig);
      
      clearInterval(progressInterval);
      setProgress(100);

      const formattedResults: AxeResults = {
        violations: axeResults.violations,
        passes: axeResults.passes,
        incomplete: axeResults.incomplete,
        inapplicable: axeResults.inapplicable,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };

      setResults(formattedResults);
      onResultsChange?.(formattedResults);

      // Announce results
      const violationCount = formattedResults.violations.length;
      const passCount = formattedResults.passes.length;
      
      if (violationCount === 0) {
        screenReader.announceSuccess(`Accessibility audit completed. No violations found. ${passCount} tests passed.`);
      } else {
        const criticalCount = formattedResults.violations.filter(v => v.impact === 'critical').length;
        const seriousCount = formattedResults.violations.filter(v => v.impact === 'serious').length;
        
        screenReader.announce(
          `Accessibility audit completed. Found ${violationCount} violations: ${criticalCount} critical, ${seriousCount} serious. ${passCount} tests passed.`,
          'assertive'
        );
      }

    } catch (error) {
      console.error('Accessibility audit failed:', error);
      screenReader.announceError('Accessibility audit failed');
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, [isRunning, target, tags, rules, onResultsChange, screenReader]);

  // Auto-run on mount
  useEffect(() => {
    if (autoRun) {
      runAudit();
    }
  }, [autoRun, runAudit]);

  // Live mode functionality
  useEffect(() => {
    if (liveMode) {
      intervalRef.current = setInterval(runAudit, 5000); // Run every 5 seconds
      screenReader.announce('Live accessibility monitoring enabled', 'polite');
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      screenReader.announce('Live accessibility monitoring disabled', 'polite');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [liveMode, runAudit, screenReader]);

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'serious':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get impact icon
  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'serious':
        return <AlertCircle className="w-4 h-4" />;
      case 'moderate':
        return <Info className="w-4 h-4" />;
      case 'minor':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  // Get category icon
  const getCategoryIcon = (tags: string[]) => {
    if (tags.includes('keyboard')) return <Keyboard className="w-4 h-4" />;
    if (tags.includes('color-contrast')) return <Eye className="w-4 h-4" />;
    if (tags.includes('aria')) return <Volume2 className="w-4 h-4" />;
    if (tags.includes('structure')) return <Monitor className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  // Export results
  const exportResults = useCallback(() => {
    if (!results) return;

    const report = {
      ...results,
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length,
        criticalCount: results.violations.filter(v => v.impact === 'critical').length,
        seriousCount: results.violations.filter(v => v.impact === 'serious').length,
        moderateCount: results.violations.filter(v => v.impact === 'moderate').length,
        minorCount: results.violations.filter(v => v.impact === 'minor').length,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accessibility-audit-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    screenReader.announceSuccess('Accessibility audit report exported');
  }, [results, screenReader]);

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

  // Group violations by impact
  const groupedViolations = results?.violations.reduce((acc, violation) => {
    const impact = violation.impact;
    if (!acc[impact]) acc[impact] = [];
    acc[impact].push(violation);
    return acc;
  }, {} as Record<string, AxeResult[]>) || {};

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Automated Accessibility Testing
              <Badge variant="secondary">axe-core</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLiveMode(!liveMode)}
                aria-pressed={liveMode}
                aria-label={`${liveMode ? 'Disable' : 'Enable'} live monitoring`}
              >
                {liveMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {liveMode ? 'Live' : 'Monitor'}
              </Button>
              
              {results && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportResults}
                  aria-label="Export audit results"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Run Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={runAudit}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Running Audit...' : 'Run Audit'}
            </Button>
            
            {progress > 0 && (
              <div className="flex-1 max-w-xs">
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {progress < 100 ? `Testing... ${progress}%` : 'Complete'}
                </div>
              </div>
            )}
          </div>

          {/* Test Configuration */}
          <div className="text-sm text-muted-foreground">
            <div>Testing for: {tags.join(', ')}</div>
            {results && (
              <div className="mt-1">
                Last run: {new Date(results.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {results.violations.length}
                </div>
                <div className="text-sm text-red-700">Violations</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.passes.length}
                </div>
                <div className="text-sm text-green-700">Passed</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {results.incomplete.length}
                </div>
                <div className="text-sm text-yellow-700">Incomplete</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {results.inapplicable.length}
                </div>
                <div className="text-sm text-gray-700">Not Applicable</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violations Details */}
      {results && results.violations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Violations by Impact</h3>
          
          {Object.entries(groupedViolations)
            .sort(([a], [b]) => {
              const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
              return (order[a as keyof typeof order] || 4) - (order[b as keyof typeof order] || 4);
            })
            .map(([impact, violations]) => (
              <Card key={impact}>
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleCategory(impact)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getImpactIcon(impact)}
                      <span className="capitalize">{impact} Issues</span>
                      <Badge variant="secondary">
                        {violations.length}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <AnimatePresence>
                  {expandedCategories.has(impact) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {violations.map((violation) => (
                            <div
                              key={violation.id}
                              className={cn(
                                'p-4 rounded-lg border',
                                getImpactColor(violation.impact)
                              )}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(violation.tags)}
                                    <h4 className="font-medium">{violation.help}</h4>
                                  </div>
                                  <a
                                    href={violation.helpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm hover:underline flex items-center gap-1"
                                    aria-label={`Learn more about ${violation.help}`}
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    Learn More
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                                
                                <p className="text-sm opacity-90">
                                  {violation.description}
                                </p>
                                
                                <div className="text-xs opacity-75">
                                  <div>Rule ID: {violation.id}</div>
                                  <div>Affected elements: {violation.nodes.length}</div>
                                  <div>Tags: {violation.tags.join(', ')}</div>
                                </div>
                                
                                {/* Affected Elements */}
                                {violation.nodes.length > 0 && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer font-medium">
                                      Affected Elements ({violation.nodes.length})
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                      {violation.nodes.slice(0, 3).map((node, index) => (
                                        <div
                                          key={index}
                                          className="p-2 bg-black/5 rounded font-mono text-xs"
                                        >
                                          <div>Target: {node.target.join(' > ')}</div>
                                          <div className="mt-1 opacity-75">
                                            {node.html.length > 100 
                                              ? `${node.html.slice(0, 100)}...` 
                                              : node.html
                                            }
                                          </div>
                                          {node.failureSummary && (
                                            <div className="mt-1 text-red-700">
                                              {node.failureSummary}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {violation.nodes.length > 3 && (
                                        <div className="text-xs opacity-75">
                                          +{violation.nodes.length - 3} more elements
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
        </div>
      )}

      {/* Passed Tests (if enabled) */}
      {results && showPassed && results.passes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Passed Tests ({results.passes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {results.passes.slice(0, 10).map((pass) => (
                <div
                  key={pass.id}
                  className="p-2 bg-green-50 border border-green-200 rounded text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{pass.help}</span>
                    <Badge variant="secondary" className="text-xs">
                      {pass.nodes.length} elements
                    </Badge>
                  </div>
                </div>
              ))}
              {results.passes.length > 10 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{results.passes.length - 10} more passed tests
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results State */}
      {!results && !isRunning && (
        <Card>
          <CardContent className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Ready to Test</h3>
            <p className="text-muted-foreground mb-4">
              Run automated accessibility tests using axe-core to identify WCAG 2.1 AA compliance issues.
            </p>
            <Button onClick={runAudit}>
              <Play className="w-4 h-4 mr-2" />
              Start Accessibility Audit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Live Region for Announcements */}
      <div className="sr-only" aria-live="polite" role="status">
        {isRunning && 'Accessibility audit in progress...'}
      </div>
    </div>
  );
};

export default AutomatedA11yTesting;
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Share2,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Eye,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Target,
  Globe,
  Calendar,
  User
} from 'lucide-react';

interface AgentRun {
  _id: string;
  agentId: any;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: {
    summary?: string;
    data?: any;
    executive_summary?: string[];
    organized_content?: Record<string, any[]>;
    metrics?: {
      execution_time?: number;
      items_processed?: number;
      success_rate?: number;
      sources_used?: string[];
    };
  };
  itemsProcessed: number;
  itemsAdded: number;
  duration?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface AgentOutputReportProps {
  run: AgentRun;
  className?: string;
  showActions?: boolean;
  onSave?: (run: AgentRun) => void;
  onShare?: (run: AgentRun) => void;
  onExport?: (run: AgentRun, format: 'json' | 'pdf' | 'markdown') => void;
}

const AgentOutputReport: React.FC<AgentOutputReportProps> = ({
  run,
  className = '',
  showActions = true,
  onSave,
  onShare,
  onExport
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const { toast } = useToast();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'Unknown';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (run.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </motion.div>;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = () => {
    switch (run.status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const agentName = typeof run.agentId === 'object' ? run.agentId.name : 'Unknown Agent';
  const executiveSummary = run.results.executive_summary || [];
  const organizedContent = run.results.organized_content || {};
  const metrics = run.results.metrics || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>{agentName} Report</span>
                  <Badge variant={getStatusBadgeVariant()}>
                    {run.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(run.createdAt)}
                  </span>
                  {run.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(run.duration)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {run.itemsProcessed} processed, {run.itemsAdded} added
                  </span>
                </CardDescription>
              </div>
            </div>
            {showActions && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(
                    JSON.stringify(run.results, null, 2),
                    'Report data'
                  )}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                {onExport && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onExport(run, 'json')}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onExport(run, 'pdf')}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                )}
                {onShare && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onShare(run)}
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {run.status === 'failed' && run.error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-700 dark:text-red-300 text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Execution Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border text-sm">
              {run.error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {Object.keys(metrics).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.execution_time && (
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-blue-600">
                    {formatDuration(metrics.execution_time)}
                  </div>
                  <div className="text-xs text-muted-foreground">Execution Time</div>
                </div>
              )}
              {metrics.items_processed !== undefined && (
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {metrics.items_processed}
                  </div>
                  <div className="text-xs text-muted-foreground">Items Processed</div>
                </div>
              )}
              {metrics.success_rate !== undefined && (
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-purple-600">
                    {Math.round(metrics.success_rate * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
              )}
              {metrics.sources_used && (
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-orange-600">
                    {metrics.sources_used.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Sources Used</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      {executiveSummary.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer" 
            onClick={() => toggleSection('summary')}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Executive Summary
              </div>
              {expandedSections.has('summary') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSections.has('summary') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent>
                  <div className="space-y-3">
                    {executiveSummary.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-muted/20 rounded border"
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-relaxed">{item}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Organized Content */}
      {Object.keys(organizedContent).length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer" 
            onClick={() => toggleSection('content')}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-500" />
                Content Results
              </div>
              {expandedSections.has('content') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSections.has('content') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(organizedContent).map(([source, items]) => {
                      if (!Array.isArray(items) || items.length === 0) return null;
                      return (
                        <div key={source} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm capitalize flex items-center gap-2">
                              <Globe className="w-3 h-3" />
                              {source.replace('_', ' ')}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {items.length} items
                            </Badge>
                          </div>
                          <ScrollArea className="h-32">
                            <div className="space-y-2">
                              {items.slice(0, 10).map((item: any, index: number) => (
                                <div key={index} className="p-2 bg-muted/20 rounded text-xs">
                                  {typeof item === 'string' ? (
                                    <p>{item}</p>
                                  ) : (
                                    <div>
                                      {item.title && (
                                        <p className="font-medium mb-1">{item.title}</p>
                                      )}
                                      {item.description && (
                                        <p className="text-muted-foreground">{item.description}</p>
                                      )}
                                      {item.url && (
                                        <a 
                                          href={item.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          View Source
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {items.length > 10 && (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  ... and {items.length - 10} more items
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Raw Data (for debugging) */}
      {run.results.data && (
        <Card>
          <CardHeader 
            className="cursor-pointer" 
            onClick={() => toggleSection('raw')}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Raw Data
              </div>
              {expandedSections.has('raw') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {expandedSections.has('raw') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent>
                  <ScrollArea className="h-64">
                    <pre className="text-xs bg-muted/30 p-3 rounded overflow-x-auto">
                      {JSON.stringify(run.results.data, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </motion.div>
  );
};

export default AgentOutputReport;
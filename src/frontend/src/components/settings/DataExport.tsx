import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Database, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Archive,
  FileDown,
  Loader2,
  Info,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import exportService, { ExportJob, ExportRequest } from '@/services/exportService';

interface DataExportProps {
  className?: string;
}

const DataExport: React.FC<DataExportProps> = ({ className = '' }) => {
  // State management
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf' | 'zip'>('json');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(['all']);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [anonymize, setAnonymize] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [useDateRange, setUseDateRange] = useState(false);
  
  // Export job state
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get content type and format info
  const contentTypes = exportService.getContentTypeInfo();
  const formats = exportService.getFormatInfo();

  // Load export history on mount
  useEffect(() => {
    loadExportHistory();
  }, []);

  // Poll for job progress when exporting
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
      pollInterval = setInterval(async () => {
        try {
          const updatedJob = await exportService.getExportStatus(currentJob.id);
          setCurrentJob(updatedJob);
          
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            setIsExporting(false);
            loadExportHistory(); // Refresh history
          }
        } catch (error) {
          console.error('Failed to poll job status:', error);
          setError('Failed to get export status');
        }
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentJob]);

  const loadExportHistory = async () => {
    try {
      const history = await exportService.getExportHistory();
      setExportHistory(history);
    } catch (error) {
      console.error('Failed to load export history:', error);
    }
  };

  const handleContentTypeChange = (contentType: string, checked: boolean) => {
    if (contentType === 'all') {
      setSelectedContentTypes(checked ? ['all'] : []);
    } else {
      setSelectedContentTypes(prev => {
        const withoutAll = prev.filter(type => type !== 'all');
        if (checked) {
          return [...withoutAll, contentType];
        } else {
          return withoutAll.filter(type => type !== contentType);
        }
      });
    }
  };

  const validateExportRequest = (): { valid: boolean; errors: string[] } => {
    const request: ExportRequest = {
      format: exportFormat,
      contentTypes: selectedContentTypes,
      dateRange: useDateRange ? dateRange || undefined : undefined,
      includeMetadata,
      anonymize
    };
    
    return exportService.validateExportRequest(request);
  };

  const handleStartExport = async () => {
    setError(null);
    
    // Validate request
    const validation = validateExportRequest();
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }
    
    const request: ExportRequest = {
      format: exportFormat,
      contentTypes: selectedContentTypes,
      dateRange: useDateRange ? dateRange || undefined : undefined,
      includeMetadata,
      anonymize
    };
    
    try {
      setIsExporting(true);
      const response = await exportService.createExport(request);
      
      // Start monitoring the job
      const job = await exportService.getExportStatus(response.jobId);
      setCurrentJob(job);
      
    } catch (error) {
      setIsExporting(false);
      setError((error as Error).message);
    }
  };

  const handleDownload = async (jobId: string) => {
    try {
      await exportService.downloadExport(jobId);
    } catch (error) {
      setError(`Download failed: ${(error as Error).message}`);
    }
  };

  const handleCancelExport = () => {
    setCurrentJob(null);
    setIsExporting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'processing': return 'bg-blue-500/20 text-blue-300';
      case 'completed': return 'bg-green-500/20 text-green-300';
      case 'failed': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Export Status */}
      <AnimatePresence>
        {currentJob && isExporting && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentJob.status)}
                    <CardTitle className="text-lg">Export in Progress</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelExport}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {currentJob.processedItems} of {currentJob.totalItems} items processed
                  </span>
                  <Badge className={getStatusColor(currentJob.status)}>
                    {currentJob.status}
                  </Badge>
                </div>
                <Progress value={currentJob.progress} className="h-2" />
                {currentJob.status === 'completed' && currentJob.downloadUrl && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(currentJob.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Export
                    </Button>
                  </div>
                )}
                {currentJob.error && (
                  <Alert className="border-red-500/20 bg-red-500/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-300">
                      {currentJob.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-red-500/20 bg-red-500/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Configuration */}
      {!isExporting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Create Data Export
            </CardTitle>
            <CardDescription>
              Export your data in various formats for backup or migration purposes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Export Format</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as any)}
                className="grid grid-cols-2 gap-4"
              >
                {formats.map((format) => (
                  <div key={format.key} className="flex items-center space-x-2">
                    <RadioGroupItem value={format.key} id={format.key} />
                    <Label htmlFor={format.key} className="flex-1 cursor-pointer">
                      <div className="p-3 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-gray-400">{format.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Pros: {format.pros.join(', ')}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Content Types */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Content to Export</Label>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {contentTypes.map((type) => (
                  <div key={type.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.key}
                      checked={selectedContentTypes.includes(type.key)}
                      onCheckedChange={(checked) => 
                        handleContentTypeChange(type.key, checked as boolean)
                      }
                    />
                    <Label htmlFor={type.key} className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-gray-400">{type.description}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Advanced Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Advanced Options</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Options
                </Button>
              </div>
              
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Date Range */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dateRange"
                          checked={useDateRange}
                          onCheckedChange={setUseDateRange}
                        />
                        <Label htmlFor="dateRange">Filter by date range</Label>
                      </div>
                      {useDateRange && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div>
                            <Label className="text-sm">Start Date</Label>
                            <Input
                              type="date"
                              value={dateRange?.start || ''}
                              onChange={(e) => setDateRange(prev => ({ 
                                ...prev, 
                                start: e.target.value,
                                end: prev?.end || ''
                              }))}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">End Date</Label>
                            <Input
                              type="date"
                              value={dateRange?.end || ''}
                              onChange={(e) => setDateRange(prev => ({ 
                                ...prev, 
                                start: prev?.start || '',
                                end: e.target.value
                              }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeMetadata"
                          checked={includeMetadata}
                          onCheckedChange={setIncludeMetadata}
                        />
                        <Label htmlFor="includeMetadata">Include metadata</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="anonymize"
                          checked={anonymize}
                          onCheckedChange={setAnonymize}
                        />
                        <Label htmlFor="anonymize">Anonymize personal data</Label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Export Button */}
            <div className="pt-4">
              <Button
                onClick={handleStartExport}
                disabled={selectedContentTypes.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Start Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export History */}
      {exportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Export History
            </CardTitle>
            <CardDescription>
              Your recent data exports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportHistory.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {job.format.toUpperCase()} Export
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(job.createdAt).toLocaleDateString()} • {job.totalItems} items
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                    {job.status === 'completed' && job.downloadUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(job.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataExport;
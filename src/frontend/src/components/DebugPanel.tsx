import React, { useState, useEffect } from 'react';
import { ErrorHandler, ErrorInfo } from '../utils/errorHandler';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ChevronDown, ChevronRight, Bug, AlertTriangle, X, Trash2 } from 'lucide-react';

interface DebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible, onClose }) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const interval = setInterval(() => {
      setErrors(ErrorHandler.getInstance().getErrors());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const filteredErrors = errors.filter(error => {
    if (filter === 'all') return true;
    return error.type === filter;
  });

  const toggleError = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const clearAllErrors = () => {
    ErrorHandler.getInstance().clearErrors();
    setErrors([]);
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'bad_request':
      case 'conflict':
        return 'bg-yellow-100 text-yellow-800';
      case 'unauthorized':
      case 'forbidden':
        return 'bg-red-100 text-red-800';
      case 'not_found':
        return 'bg-blue-100 text-blue-800';
      case 'service_unavailable':
      case 'timeout':
        return 'bg-purple-100 text-purple-800';
      case 'server_error':
      case 'network_error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const uniqueErrorTypes = Array.from(new Set(errors.map(e => e.type)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Panel ({errors.length} errors)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllErrors}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filter === 'all' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              All ({errors.length})
            </Badge>
            {uniqueErrorTypes.map(type => (
              <Badge
                key={type}
                variant={filter === type ? 'default' : 'secondary'}
                className={`cursor-pointer ${getErrorTypeColor(type)}`}
                onClick={() => setFilter(type)}
              >
                {type} ({errors.filter(e => e.type === type).length})
              </Badge>
            ))}
          </div>

          {/* Error List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {filteredErrors.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No errors found
                </div>
              ) : (
                filteredErrors.map((error, index) => (
                  <Card key={index} className="border">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 pb-2"
                      onClick={() => toggleError(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedErrors.has(index) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <Badge className={getErrorTypeColor(error.type)}>
                            {error.type}
                          </Badge>
                          {error.statusCode && (
                            <Badge variant="outline">{error.statusCode}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm truncate">{error.message}</p>
                      </div>
                    </CardHeader>
                    
                    {expandedErrors.has(index) && (
                      <CardContent className="pt-0 space-y-3">
                        {/* Error Details */}
                        <div>
                          <h4 className="font-medium text-sm mb-1">Full Message:</h4>
                          <p className="text-sm bg-gray-100 p-2 rounded">{error.message}</p>
                        </div>

                        {/* Suggestions */}
                        {error.suggestions && error.suggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Suggestions:</h4>
                            <ul className="text-sm space-y-1">
                              {error.suggestions.map((suggestion, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-blue-600">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Context */}
                        {error.context && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Context:</h4>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(error.context, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Original Error */}
                        <div>
                          <h4 className="font-medium text-sm mb-1">Original Error:</h4>
                          <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-40">
                            {error.originalError.stack || error.originalError.toString()}
                          </pre>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
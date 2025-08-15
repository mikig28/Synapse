import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred while loading this page
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details in development mode */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="font-semibold text-sm">Error Details:</p>
                  <pre className="text-xs overflow-auto p-2 bg-background rounded border">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.error.stack && (
                    <>
                      <p className="font-semibold text-sm mt-4">Stack Trace:</p>
                      <pre className="text-xs overflow-auto p-2 bg-background rounded border max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                  {this.state.errorInfo && (
                    <>
                      <p className="font-semibold text-sm mt-4">Component Stack:</p>
                      <pre className="text-xs overflow-auto p-2 bg-background rounded border max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                >
                  Reload Page
                </Button>
                <Button
                  onClick={() => window.history.back()}
                  variant="ghost"
                >
                  Go Back
                </Button>
              </div>
              
              {/* Helpful tips */}
              <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
                <p>If this error persists, try:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Clearing your browser cache</li>
                  <li>Checking your internet connection</li>
                  <li>Logging out and back in</li>
                  <li>Contacting support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
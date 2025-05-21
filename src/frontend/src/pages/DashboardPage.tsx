import React from 'react';
import { useDigest } from '../context/DigestContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DashboardPage: React.FC = () => {
  const { latestDigest } = useDigest();
  console.log('[DashboardPage] Consuming latestDigest from context:', latestDigest);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {latestDigest && (
        <Card className="mb-6 bg-secondary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-purple-600" /> Recent Bookmarks Digest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestDigest.startsWith("OPENAI_API_KEY not configured") || 
             latestDigest.startsWith("Failed to extract summary") || 
             latestDigest.startsWith("OpenAI API error") || 
             latestDigest.startsWith("Content was empty") ||
             latestDigest.startsWith("Could not generate a digest") ||
             latestDigest.startsWith("No valid content") ||
             latestDigest.startsWith("No new bookmarks") ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Digest Generation Issue</AlertTitle>
                <AlertDescription>{latestDigest}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {latestDigest}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p>Welcome to your Synapse dashboard! Other content will go here.</p>
      {/* Further dashboard content */}
    </div>
  );
};

export default DashboardPage; 
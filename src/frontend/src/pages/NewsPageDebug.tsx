import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const NewsPageDebug: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Test data
  const testNewsItem = {
    _id: 'test-1',
    title: 'Test CrewAI Analysis Report',
    description: 'This is a test report to debug the modal',
    content: `## Executive Summary

This is test content to verify the modal is working properly.

### Key Points:
- The modal should open when clicking the eye icon
- Content should be displayed properly
- Scrolling should work if content is long

## Test Section

Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
This is additional test content to ensure everything displays correctly.

### Subsection
- Point 1
- Point 2
- Point 3

## Conclusion

If you can see this content in a modal, the system is working!`,
    url: '#internal-test',
    source: { id: 'crewai_analysis', name: 'Test Source' },
    publishedAt: new Date().toISOString()
  };
  
  const handleViewContent = (item: any) => {
    console.log('🔍 Viewing content for:', item.title);
    console.log('Content:', item.content);
    setSelectedItem(item);
    setShowModal(true);
  };
  
  useEffect(() => {
    console.log('Modal state:', showModal);
    console.log('Selected item:', selectedItem);
  }, [showModal, selectedItem]);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">News Page Debug Test</h1>
      
      <Card className="mb-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">{testNewsItem.title}</h2>
          <p className="text-muted-foreground mb-4">{testNewsItem.description}</p>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => handleViewContent(testNewsItem)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Content (Should Open Modal)
            </Button>
            
            <Button
              variant="outline"
              onClick={() => alert('External link clicked')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              External Link (Should Show Alert)
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded">
            <p className="text-sm">Debug Info:</p>
            <p className="text-xs">Modal Open: {showModal ? 'Yes' : 'No'}</p>
            <p className="text-xs">Item Selected: {selectedItem ? 'Yes' : 'No'}</p>
            <p className="text-xs">URL: {testNewsItem.url}</p>
            <p className="text-xs">Is Internal: {testNewsItem.url.startsWith('#') ? 'Yes' : 'No'}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Test Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.title || 'No Title'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Source: {selectedItem?.source?.name}
              </div>
              
              {selectedItem?.content ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap">{selectedItem.content}</pre>
                </div>
              ) : (
                <p className="text-red-500">No content available</p>
              )}
            </div>
          </ScrollArea>
          
          <div className="mt-4">
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsPageDebug;
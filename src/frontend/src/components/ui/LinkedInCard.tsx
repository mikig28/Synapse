import React from 'react';
import { BookmarkItemType } from '@/types/bookmark';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter // Import CardFooter if needed for buttons
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, Briefcase } from 'lucide-react'; // Using Briefcase for LinkedIn

interface LinkedInCardProps {
  bookmark: BookmarkItemType;
  onDelete: (bookmarkId: string) => void;
}

const LinkedInCard: React.FC<LinkedInCardProps> = ({ bookmark, onDelete }) => {
  // DEBUG: Log formatted date for LinkedIn card
  const formattedDate = new Date(bookmark.createdAt).toLocaleString(undefined, { 
      year: 'numeric', month: 'numeric', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
  });
  console.log(`LinkedIn Card - Bookmark ${bookmark._id} createdAt: ${bookmark.createdAt}, Formatted: ${formattedDate}`);

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="flex-grow p-4">
        <CardTitle className="text-base font-semibold leading-tight mb-1 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-blue-700" />
            <span className="line-clamp-2" title={bookmark.fetchedTitle || bookmark.originalUrl}>
                {bookmark.fetchedTitle || 'LinkedIn Post'}
            </span>
        </CardTitle>
        {bookmark.fetchedDescription && (
          <CardDescription className="text-sm text-muted-foreground line-clamp-3">
            {bookmark.fetchedDescription}
          </CardDescription>
        )}
      </CardHeader>
      {/* Optional: Display image if fetchedImageUrl exists */}
      {/* {bookmark.fetchedImageUrl && (
        <img 
          src={bookmark.fetchedImageUrl}
          alt={`Preview for ${bookmark.fetchedTitle || 'LinkedIn Post'}`}
          className="w-full h-40 object-cover" // Adjust height as needed
        />
      )} */}
      <CardFooter className="p-4 pt-2 border-t mt-auto"> {/* Ensure footer is at the bottom */}
        <div className="flex justify-between items-center w-full">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => window.open(bookmark.originalUrl, '_blank')}
            title="View on LinkedIn"
            className="text-xs"
          >
            <ExternalLink className="w-4 h-4 mr-1" /> View Post
          </Button>
          <Button 
            variant="destructive" 
            size="icon" 
            onClick={() => onDelete(bookmark._id)} 
            title="Delete Bookmark"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 w-full text-right">
            Saved: {formattedDate}
        </p>
      </CardFooter>
    </Card>
  );
};

export default LinkedInCard; 
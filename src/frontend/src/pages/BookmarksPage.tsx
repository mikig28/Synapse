import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Info } from 'lucide-react';
import { getBookmarks } from '../services/bookmarkService';
import { BookmarkItemType } from '../types/bookmark';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        const data = await getBookmarks();
        setBookmarks(data);
        setError(null);
      } catch (err) {
        setError('Failed to load bookmarks. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  // Group bookmarks by platform for display
  const groupedBookmarks = bookmarks.reduce((acc, bookmark) => {
    const platform = bookmark.sourcePlatform;
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(bookmark);
    return acc;
  }, {} as Record<string, BookmarkItemType[]>);

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <p>Loading bookmarks...</p> {/* Replace with a spinner later */}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">My Bookmarks</CardTitle>
          <CardDescription>
            Links captured from social media, organized for you.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {Object.keys(groupedBookmarks).length === 0 && !loading && !error && (
         <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>No Bookmarks Yet</AlertTitle>
          <AlertDescription>
            Once you send Telegram messages containing links from X (Twitter) or LinkedIn, they will appear here after being processed.
          </AlertDescription>
        </Alert>
      )}

      {Object.entries(groupedBookmarks).map(([platform, items]) => (
        <div key={platform} className="mb-8">
          <h2 className="text-xl font-semibold mb-3 capitalize border-b pb-2">{platform} Links</h2>
          {items.length === 0 ? (
            <p className="text-muted-foreground">No links from {platform} yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((bookmark) => (
                <Card key={bookmark._id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg leading-tight">
                      {bookmark.title || new URL(bookmark.originalUrl).hostname}
                    </CardTitle>
                    <CardDescription className="text-xs pt-1">
                      Captured: {new Date(bookmark.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {bookmark.summary ? (
                      <p className="text-sm text-muted-foreground mb-2 break-words">
                        {bookmark.summary} (AI summary coming soon)
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mb-2">
                        Summary pending...
                      </p>
                    )}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                      <div className="mb-2">
                        {bookmark.tags.map(tag => (
                          <span key={tag} className="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full mr-1 mb-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <a
                      href={bookmark.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center"
                    >
                      View Original <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </CardContent>
                  {/* <CardFooter className="text-xs text-muted-foreground">
                    Status: {bookmark.status}
                  </CardFooter> */}
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BookmarksPage; 
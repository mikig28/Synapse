import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBookmarks } from '../services/bookmarkService';
import { BookmarkItemType } from '../types/bookmark';
import useAuthStore from '@/store/authStore';

const BookmarksPageSimple: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!token) return;
      
      try {
        console.log('Fetching bookmarks...');
        const response = await getBookmarks(1, 10);
        console.log('Bookmarks response:', response);
        setBookmarks(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching bookmarks:', err);
        setError('Failed to load bookmarks');
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [token]);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Bookmarks</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Bookmarks</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Bookmarks ({bookmarks.length})</h1>
      
      {bookmarks.length === 0 ? (
        <p>No bookmarks found.</p>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark._id} className="p-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  {bookmark.title || bookmark.fetchedTitle || 'Untitled'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{bookmark.originalUrl}</p>
                {bookmark.summary && (
                  <p className="text-sm">{bookmark.summary}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(bookmark.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksPageSimple;

import React, { useEffect, useState } from 'react';
import useAuthStore from '@/store/authStore';
import { BACKEND_ROOT_URL } from '@/services/axiosConfig';

// Define an interface for the idea data
interface Idea {
  _id: string;
  content: string;
  source?: string;
  telegramMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

const IdeasPage: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchIdeas = async () => {
      if (!token) {
        setError('Authentication token not found.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${BACKEND_ROOT_URL}/api/v1/ideas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIdeas(data);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch ideas:", err);
        setError(err.message || 'Failed to fetch ideas.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIdeas();
  }, [token]);

  if (isLoading) {
    return <div>Loading ideas...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ideas</h1>
      {ideas.length === 0 ? (
        <p>No ideas found.</p>
      ) : (
        <ul className="space-y-3">
          {ideas.map((idea) => (
            <li key={idea._id} className="p-4 border rounded-lg shadow-sm bg-card">
              <p className="text-card-foreground whitespace-pre-wrap">{idea.content}</p>
              {idea.source && <span className="mt-2 inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Source: {idea.source}</span>}
              <p className="text-xs text-muted-foreground mt-2">Created: {new Date(idea.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IdeasPage; 
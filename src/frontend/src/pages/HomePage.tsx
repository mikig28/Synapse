import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import TelegramFeed from "@/components/Dashboard/TelegramFeed"; // Assuming this path is correct

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="mb-4 text-xl">HomePage Placeholder. Login to see more.</p>
      <Link to="/login">
        <button 
          className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Login
        </button>
      </Link>
      <div className="my-8 w-full max-w-2xl">
        <TelegramFeed />
      </div>
    </div>
  );
};

export default HomePage; 
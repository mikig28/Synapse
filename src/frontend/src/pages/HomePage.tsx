import React from 'react';
import TelegramFeed from "@/components/Dashboard/TelegramFeed"; // Assuming this path is correct

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      HomePage Placeholder. Login to see more.
      <div className="my-4 w-full max-w-2xl">
        <TelegramFeed />
      </div>
    </div>
  );
};

export default HomePage; 
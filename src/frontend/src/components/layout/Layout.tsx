import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <main className="flex flex-grow flex-col items-center justify-center p-6 bg-background transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
      {/* Footer can be added here, outside the flex-1 div if it shouldn't be part of the scrollable area with sidebar */}
    </div>
  );
};

export default Layout; 
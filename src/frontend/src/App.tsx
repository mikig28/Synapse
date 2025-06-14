import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import DashboardPage from '@/pages/DashboardPage';
import InboxPage from '@/pages/InboxPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ImagesPage from '@/pages/ImagesPage';
import BookmarksPage from './pages/BookmarksPage';
import VideosPage from './pages/VideosPage';
import useAuthStore from '@/store/authStore';
import HomePage from '@/pages/HomePage';
import { ThemeProvider } from "@/components/theme-provider";
import TasksPage from '@/pages/TasksPage';
import NotesPage from '@/pages/NotesPage';
import IdeasPage from '@/pages/IdeasPage';
import MeetingsPage from '@/pages/MeetingsPage';
import AgentsPage from '@/pages/AgentsPage';
import NewsPage from '@/pages/NewsPage';
import { PageTransition } from '@/components/animations';
import { CommandPalette, useCommandPalette } from '@/components/animations';
import { DigestProvider } from './context/DigestContext';
import { useLocation } from 'react-router-dom';

function AppContent() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const commandPalette = useCommandPalette();

  return (
    <DigestProvider>
      <PageTransition key={location.pathname}>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={isAuthenticated ? <Layout><DashboardPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/inbox" element={isAuthenticated ? <Layout><InboxPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/tasks" element={isAuthenticated ? <Layout><TasksPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/notes" element={isAuthenticated ? <Layout><NotesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/ideas" element={isAuthenticated ? <Layout><IdeasPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings" element={isAuthenticated ? <Layout><MeetingsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/agents" element={isAuthenticated ? <Layout><AgentsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/news" element={isAuthenticated ? <Layout><NewsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/images" element={isAuthenticated ? <Layout><ImagesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/bookmarks" element={isAuthenticated ? <Layout><BookmarksPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/videos" element={isAuthenticated ? <Layout><VideosPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <Layout><SettingsPage /></Layout> : <Navigate to="/login" />} />
        </Routes>
      </PageTransition>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
      />
    </DigestProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;

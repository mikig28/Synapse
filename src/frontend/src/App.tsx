import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import useAuthStore from '@/store/authStore';
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from '@/components/animations';
import { CommandPalette, useCommandPalette } from '@/components/animations';
import { DigestProvider } from './context/DigestContext';
import { TelegramProvider } from './contexts/TelegramContext';
import { useLocation } from 'react-router-dom';
import { PWAProvider } from './components/pwa/PWAPrompts';

// Lazy load all pages for better performance
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const InboxPage = React.lazy(() => import('@/pages/InboxPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const ImagesPage = React.lazy(() => import('@/pages/ImagesPage'));
const BookmarksPage = React.lazy(() => import('./pages/BookmarksPage'));
const VideosPage = React.lazy(() => import('./pages/VideosPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const TasksPage = React.lazy(() => import('@/pages/TasksPage'));
const NotesPage = React.lazy(() => import('@/pages/NotesPage'));
const IdeasPage = React.lazy(() => import('@/pages/IdeasPage'));
const MeetingsPage = React.lazy(() => import('@/pages/MeetingsPage'));
const AgentsPage = React.lazy(() => import('@/pages/AgentsPage'));
const NewsPage = React.lazy(() => import('@/pages/NewsPage'));

// Loading component with beautiful animation
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent rounded-full animate-spin mx-auto" style={{ animationDelay: '0.3s', animationDuration: '1.2s' }}></div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold gradient-text">Loading...</h3>
        <p className="text-sm text-muted-foreground">Preparing your digital brain</p>
      </div>
    </div>
  </div>
);

function AppContent() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const commandPalette = useCommandPalette();

  return (
    <DigestProvider>
      <TelegramProvider>
        <PageTransition key={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={isAuthenticated ? <Layout><DashboardPage /></Layout> : <Navigate to="/login" />} />
              <Route path="/inbox" element={isAuthenticated ? <Layout><InboxPage /></Layout> : <Navigate to="/login" />} />
              <Route path="/calendar" element={isAuthenticated ? <Layout><CalendarPage /></Layout> : <Navigate to="/login" />} />
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
          </Suspense>
        </PageTransition>

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={commandPalette.isOpen}
          onClose={commandPalette.close}
        />
      </TelegramProvider>
    </DigestProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <PWAProvider>
          <AppContent />
        </PWAProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

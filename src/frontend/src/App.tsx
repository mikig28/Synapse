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
import { Settings, LogIn, UserPlus, LayoutDashboard, Inbox } from 'lucide-react';
import HomePage from '@/pages/HomePage';
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import TasksPage from '@/pages/TasksPage';
import NotesPage from '@/pages/NotesPage';
import IdeasPage from '@/pages/IdeasPage';
import { GoogleOAuthProvider } from '@react-oauth/google';

const App: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not defined. Google Sign-In will not work.");
    // Optionally, render a message to the user or a disabled login button
  }

  // Placeholder for loginWithRedirect if not using a specific provider yet
  const loginWithRedirect = () => console.log("loginWithRedirect function called - needs implementation");

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <Router>
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <HomePage />} />

            <Route 
              path="/*" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<DashboardPage />} />
                      <Route path="inbox" element={<InboxPage />} />
                      <Route path="images" element={<ImagesPage />} />
                      <Route path="bookmarks" element={<BookmarksPage />} />
                      <Route path="videos" element={<VideosPage />} />
                      <Route path="tasks" element={<TasksPage />} />
                      <Route path="notes" element={<NotesPage />} />
                      <Route path="ideas" element={<IdeasPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App; 
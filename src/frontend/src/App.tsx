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
import CalendarPage from '@/pages/CalendarPage';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DigestProvider } from './context/DigestContext';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/animations/PageTransition';

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
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Router>
          <DigestProvider>
            <main className="flex-1">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route 
                    path="/login" 
                    element={
                      isAuthenticated ? (
                        <Navigate to="/dashboard" />
                      ) : (
                        <PageTransition mode="fade">
                          <LoginPage />
                        </PageTransition>
                      )
                    } 
                  />
                  <Route 
                    path="/register" 
                    element={
                      isAuthenticated ? (
                        <Navigate to="/dashboard" />
                      ) : (
                        <PageTransition mode="fade">
                          <RegisterPage />
                        </PageTransition>
                      )
                    } 
                  />
                  <Route 
                    path="/" 
                    element={
                      isAuthenticated ? (
                        <Navigate to="/dashboard" />
                      ) : (
                        <PageTransition mode="scale">
                          <HomePage />
                        </PageTransition>
                      )
                    } 
                  />

                  <Route 
                    path="/*" 
                    element={
                      isAuthenticated ? (
                        <Layout>
                          <Routes>
                            <Route path="dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
                            <Route path="inbox" element={<PageTransition><InboxPage /></PageTransition>} />
                            <Route path="images" element={<PageTransition><ImagesPage /></PageTransition>} />
                            <Route path="bookmarks" element={<PageTransition><BookmarksPage /></PageTransition>} />
                            <Route path="videos" element={<PageTransition><VideosPage /></PageTransition>} />
                            <Route path="tasks" element={<PageTransition><TasksPage /></PageTransition>} />
                            <Route path="notes" element={<PageTransition><NotesPage /></PageTransition>} />
                            <Route path="ideas" element={<PageTransition><IdeasPage /></PageTransition>} />
                            <Route path="meetings" element={<PageTransition><MeetingsPage /></PageTransition>} />
                            <Route path="calendar" element={<PageTransition><CalendarPage /></PageTransition>} />
                            <Route path="settings" element={<PageTransition mode="fade"><SettingsPage /></PageTransition>} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </Layout>
                      ) : (
                        <Navigate to="/login" replace />
                      )
                    }
                  />
                </Routes>
              </AnimatePresence>
            </main>
          </DigestProvider>
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;

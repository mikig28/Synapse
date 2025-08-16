import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import useAuthStore from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from '@/components/animations';
import { CommandPalette, useCommandPalette } from '@/components/animations';
import { DigestProvider } from './context/DigestContext';
import { TelegramProvider } from './contexts/TelegramContext';
import { useLocation } from 'react-router-dom';
import { PWAProvider } from './components/pwa/PWAPrompts';
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import { ReactPlugin } from '@stagewise-plugins/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AguiNotifications } from './components/AguiNotifications';
import { FeedbackWidget } from './components/feedback/FeedbackWidget';
import { Toaster } from '@/components/ui/toaster';
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { AguiProvider } from './contexts/AguiContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initMobileOptimizations, preloadMobileResources } from '@/utils/mobileOptimizations';

// Initialize mobile optimizations
if (typeof window !== 'undefined') {
  initMobileOptimizations();
  preloadMobileResources();
}

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
const AgentSettingsPage = React.lazy(() => import('@/pages/AgentSettingsPage'));
const ScheduledAgentsPage = React.lazy(() => import('@/pages/ScheduledAgentsPage'));
const NewsPage = React.lazy(() => import('@/pages/NewsPage'));
const WhatsAppPage = React.lazy(() => import('@/pages/WhatsAppPage'));
const WhatsAppGroupMonitorPage = React.lazy(() => import('@/pages/WhatsAppGroupMonitorPage'));
const PlacesPage = React.lazy(() => import('@/pages/PlacesPage'));
const DocsPage = React.lazy(() => import('@/pages/DocsPage'));
const SearchPage = React.lazy(() => import('@/pages/SearchPage'));
const OnboardingPage = React.lazy(() => import('@/pages/OnboardingPage'));

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
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { isOnboarding, progress } = useOnboardingStore();
  const location = useLocation();
  const commandPalette = useCommandPalette();

  // Wait for auth hydration before deciding routes to avoid flicker/redirects on mobile
  if (!hasHydrated) {
    return <PageLoader />;
  }

  // Check if user needs onboarding (first time users or incomplete onboarding)
  const needsOnboarding = isAuthenticated && (
    progress.completedSteps.length === 0 || 
    (isOnboarding && progress.completedSteps.length < progress.totalSteps)
  );

  return (
    <AccessibilityProvider>
      <AnimationProvider>
        <AguiProvider>
          <DigestProvider>
            <TelegramProvider>
              <PageTransition key={location.pathname}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={isAuthenticated ? (needsOnboarding ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : <HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
                    {/* Onboarding route - temporarily accessible without auth for testing */}
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    
                    {/* Protected routes */}
                    <Route path="/dashboard" element={isAuthenticated ? (needsOnboarding ? <Navigate to="/onboarding" /> : <Layout><DashboardPage /></Layout>) : <Navigate to="/login" />} />
                    <Route path="/search" element={isAuthenticated ? <Layout><SearchPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/inbox" element={isAuthenticated ? <Layout><InboxPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/calendar" element={isAuthenticated ? <Layout><CalendarPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/tasks" element={isAuthenticated ? <Layout><TasksPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/notes" element={isAuthenticated ? <Layout><NotesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/ideas" element={isAuthenticated ? <Layout><IdeasPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/meetings" element={isAuthenticated ? <Layout><MeetingsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/agents" element={isAuthenticated ? <Layout><ErrorBoundary><AgentsPage /></ErrorBoundary></Layout> : <Navigate to="/login" />} />
                    <Route path="/agents/:agentId/settings" element={isAuthenticated ? <Layout><AgentSettingsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/scheduled-agents" element={isAuthenticated ? <Layout><ScheduledAgentsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/news" element={isAuthenticated ? <Layout><NewsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/images" element={isAuthenticated ? <Layout><ImagesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/bookmarks" element={isAuthenticated ? <Layout><BookmarksPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/videos" element={isAuthenticated ? <Layout><VideosPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/whatsapp" element={isAuthenticated ? <Layout><WhatsAppPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/whatsapp-monitor" element={isAuthenticated ? <Layout><WhatsAppGroupMonitorPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/maps" element={isAuthenticated ? <Navigate to="/places" /> : <Navigate to="/login" />} />
                    <Route path="/places" element={isAuthenticated ? <Layout><PlacesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/docs" element={isAuthenticated ? <Layout><DocsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/settings" element={isAuthenticated ? <Layout><SettingsPage /></Layout> : <Navigate to="/login" />} />
                  </Routes>
                </Suspense>
              </PageTransition>

              {/* Global Command Palette */}
              <CommandPalette
                isOpen={commandPalette.isOpen}
                onClose={commandPalette.close}
              />

              {/* AG-UI Notifications */}
              <AguiNotifications />

              {/* Feedback Widget (only show on protected routes) */}
              {isAuthenticated && !needsOnboarding && (
                <FeedbackWidget position="bottom-right" showQuickActions={true} />
              )}
              
              {/* Toast Container */}
              <Toaster />
            </TelegramProvider>
          </DigestProvider>
        </AguiProvider>
      </AnimationProvider>
    </AccessibilityProvider>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <GoogleMapsProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Router>
            <PWAProvider>
              <AppContent />
              <StagewiseToolbar
                config={{
                  plugins: [ReactPlugin]
                }}
              />
            </PWAProvider>
          </Router>
        </ThemeProvider>
      </GoogleMapsProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

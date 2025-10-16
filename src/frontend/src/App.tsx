import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import useAuthStore from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from '@/components/animations';
import { CommandPalette, useCommandPalette } from '@/components/animations';
import { NavigationProgress } from '@/components/animations/NavigationProgress';
import { DigestProvider } from './context/DigestContext';
import { TelegramProvider } from './contexts/TelegramContext';
import { TelegramChannelsProvider } from './contexts/TelegramChannelsContext';
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

// Lazy load pages with preloading for critical routes
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const InboxPage = React.lazy(() => import('@/pages/InboxPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));

// Preload critical pages after initial render
const preloadCriticalPages = () => {
  // Preload dashboard and inbox for faster navigation
  import('@/pages/DashboardPage');
  import('@/pages/InboxPage');
  import('@/pages/TasksPage');
  import('@/pages/NotesPage');
};
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const EmailVerificationPage = React.lazy(() => import('@/pages/EmailVerificationPage'));
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
const NewsPageFixed = React.lazy(() => import('@/pages/NewsPageFixed'));
const NewsMobile = React.lazy(() => import('@/pages/NewsMobile'));
const MobileNewsPageOptimized = React.lazy(() => import('@/pages/MobileNewsPageOptimized'));
const SmartNewsRouter = React.lazy(() => import('@/components/SmartNewsRouter'));
const WhatsAppPage = React.lazy(() => import('@/pages/WhatsAppPage'));
const WhatsAppGroupMonitorPage = React.lazy(() => import('@/pages/WhatsAppGroupMonitorPage'));
const PlacesPage = React.lazy(() => import('@/pages/PlacesPage'));
const DocsPage = React.lazy(() => import('@/pages/DocsPage'));
const SearchPage = React.lazy(() => import('@/pages/SearchPage'));
const TelegramChannelsPage = React.lazy(() => import('@/pages/TelegramChannelsPage'));
const OnboardingPage = React.lazy(() => import('@/pages/OnboardingPage'));
const NewsHubPage = React.lazy(() => import('@/pages/NewsHubPage'));
const CapturePage = React.lazy(() => import('@/pages/CapturePage'));
const ProjectsPage = React.lazy(() => import('@/pages/ProjectsPage'));
const PlanningPage = React.lazy(() => import('@/pages/PlanningPage'));
const GoalsPage = React.lazy(() => import('@/pages/GoalsPage'));
const HabitsPage = React.lazy(() => import('@/pages/HabitsPage'));
const AutomationsPage = React.lazy(() => import('@/pages/AutomationsPage'));
const RecipesPage = React.lazy(() => import('@/pages/RecipesPage'));
const ReelsAndStoriesPage = React.lazy(() => import('@/pages/ReelsAndStoriesPage'));
const AdminDashboardPage = React.lazy(() => import('@/pages/AdminDashboardPage'));
const EmptyStateTestPage = React.lazy(() => import('@/pages/EmptyStateTestPage'));

// Beautiful but performant loading component
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
    <div className="text-center space-y-3">
      <div className="relative w-12 h-12 mx-auto">
        {/* Primary spinner */}
        <div className="absolute inset-0 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        {/* Secondary glow effect */}
        <div className="absolute inset-0 border-3 border-transparent border-t-accent/40 rounded-full animate-spin blur-sm"
             style={{ animationDuration: '1s', animationDirection: 'reverse' }}></div>
      </div>
      <p className="text-sm font-medium text-muted-foreground/80 animate-pulse">Loading...</p>
    </div>
  </div>
);

function AppContent() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { isOnboarding, onboardingDismissed, progress } = useOnboardingStore();
  const location = useLocation();
  const commandPalette = useCommandPalette();

  // Preload critical pages after user is authenticated
  React.useEffect(() => {
    if (isAuthenticated && hasHydrated) {
      // Use setTimeout to avoid blocking initial render
      setTimeout(preloadCriticalPages, 100);
    }
  }, [isAuthenticated, hasHydrated]);

  // Wait for auth hydration before deciding routes to avoid flicker/redirects on mobile
  if (!hasHydrated) {
    return <PageLoader />;
  }

  // Check if user needs onboarding (first time users only)
  // Once dismissed, onboarding should not automatically redirect user
  const needsOnboarding = isAuthenticated && !onboardingDismissed && progress.completedSteps.length === 0;

  return (
    <AccessibilityProvider>
      <AnimationProvider>
        <AguiProvider>
          <DigestProvider>
            <TelegramProvider>
              <TelegramChannelsProvider>
              {/* Beautiful top progress bar during navigation */}
              <NavigationProgress />

              <PageTransition key={location.pathname} mode="fade">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={isAuthenticated ? (needsOnboarding ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : <HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<EmailVerificationPage />} />

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
                    <Route path="/news" element={isAuthenticated ? <SmartNewsRouter /> : <Navigate to="/login" />} />
                    <Route path="/news-desktop" element={isAuthenticated ? <Layout><NewsPageFixed /></Layout> : <Navigate to="/login" />} />
                    <Route path="/news-mobile" element={isAuthenticated ? <MobileNewsPageOptimized /> : <Navigate to="/login" />} />
                    <Route path="/news-legacy" element={isAuthenticated ? <Layout><NewsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/news-hub" element={isAuthenticated ? <Layout><NewsHubPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/images" element={isAuthenticated ? <Layout><ImagesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/bookmarks" element={isAuthenticated ? <Layout><BookmarksPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/videos" element={isAuthenticated ? <Layout><VideosPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/whatsapp" element={isAuthenticated ? <Layout><WhatsAppPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/whatsapp-monitor" element={isAuthenticated ? <Layout><WhatsAppGroupMonitorPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/telegram-channels" element={isAuthenticated ? <Layout><TelegramChannelsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/maps" element={isAuthenticated ? <Navigate to="/places" /> : <Navigate to="/login" />} />
                    <Route path="/places" element={isAuthenticated ? <Layout><PlacesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/docs" element={isAuthenticated ? <Layout><DocsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/settings" element={isAuthenticated ? <Layout><SettingsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/capture" element={isAuthenticated ? <Layout><CapturePage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/projects" element={isAuthenticated ? <Layout><ProjectsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/planning" element={isAuthenticated ? <Layout><PlanningPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/goals" element={isAuthenticated ? <Layout><GoalsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/habits" element={isAuthenticated ? <Layout><HabitsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/automations" element={isAuthenticated ? <Layout><AutomationsPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/recipes" element={isAuthenticated ? <Layout><RecipesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/reels-stories" element={isAuthenticated ? <Layout><ReelsAndStoriesPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/admin" element={isAuthenticated ? <Layout><AdminDashboardPage /></Layout> : <Navigate to="/login" />} />
                    <Route path="/test-empty-state" element={<EmptyStateTestPage />} />
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
              </TelegramChannelsProvider>
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

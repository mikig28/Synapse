/**
 * Animation System Integration Example
 * Demonstrates how to use the comprehensive animation system
 * Includes performance monitoring and accessibility features
 */

import React, { useState } from 'react';
import { 
  AnimationProvider,
  EnhancedAnimatedCard,
  MagneticButton,
  SwipeableCard,
  AnimatedInput,
  AnimatedForm,
  AnimatedCounter,
  AnimatedMetricCard,
  AnimatedStatsGrid,
  AnimatedModal,
  ToastContainer,
  PageTransitionProvider,
  EnhancedPageWrapper,
  FloatingTooltip,
  CelebrationEffect,
  LiquidProgress,
  MorphingIconButton
} from '@/components/animations';
import { Play, Pause, Settings, Star, Heart, Zap } from 'lucide-react';

// =============================================================================
// EXAMPLE: ENHANCED AGENTS PAGE WITH FULL ANIMATION SYSTEM
// =============================================================================

export const AnimatedAgentsPageExample: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [progress, setProgress] = useState(65);
  const [currentIcon, setCurrentIcon] = useState(0);
  const [toasts, setToasts] = useState<any[]>([]);

  // Sample data
  const agentStats = [
    {
      title: 'Active Agents',
      value: 24,
      previousValue: 18,
      trend: 'up' as const,
      icon: <Star className="w-4 h-4" />,
      color: 'hsl(220, 90%, 50%)',
    },
    {
      title: 'Tasks Completed',
      value: 1847,
      previousValue: 1654,
      trend: 'up' as const,
      icon: <Zap className="w-4 h-4" />,
      color: 'hsl(142, 76%, 36%)',
    },
    {
      title: 'Success Rate',
      value: 94,
      previousValue: 89,
      format: (v: number) => `${v}%`,
      trend: 'up' as const,
      icon: <Heart className="w-4 h-4" />,
      color: 'hsl(346, 87%, 43%)',
    },
  ];

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => {
    const id = Date.now().toString();
    const newToast = {
      id,
      type,
      title,
      description,
      onClose: (toastId: string) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      },
    };
    setToasts(prev => [...prev, newToast]);
  };

  return (
    <AnimationProvider
      initialPreferences={{
        enableAnimations: true,
        animationIntensity: 'premium',
        enableHaptics: true,
        performanceMode: 'auto',
      }}
    >
      <PageTransitionProvider>
        <EnhancedPageWrapper
          pageTitle="AI Agents Dashboard"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Agents' },
          ]}
          actions={
            <div className="flex gap-2">
              <FloatingTooltip content="Open agent settings">
                <MagneticButton
                  variant="ghost"
                  size="sm"
                  magneticStrength="subtle"
                  onClick={() => setShowModal(true)}
                >
                  <Settings className="w-4 h-4" />
                </MagneticButton>
              </FloatingTooltip>
              
              <MagneticButton
                variant="premium"
                size="md"
                magneticStrength="medium"
                glowEffect
                onClick={() => {
                  setShowCelebration(true);
                  addToast('success', 'Agent Created!', 'Your new AI agent is ready to work.');
                }}
              >
                Create Agent
              </MagneticButton>
            </div>
          }
        >
          <div className="space-y-8">
            {/* Stats Grid */}
            <AnimatedStatsGrid
              stats={agentStats}
              columns={3}
              className="mb-8"
            />

            {/* Interactive Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Progress Demo */}
              <EnhancedAnimatedCard
                variant="premium"
                hoverEffect="lift"
                className="p-6"
              >
                <h3 className="text-lg font-semibold mb-4">System Health</h3>
                <LiquidProgress
                  progress={progress}
                  height={12}
                  showPercentage
                  liquid
                  className="mb-4"
                />
                <div className="flex gap-2">
                  <MagneticButton
                    size="sm"
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    Decrease
                  </MagneticButton>
                  <MagneticButton
                    size="sm"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    Increase
                  </MagneticButton>
                </div>
              </EnhancedAnimatedCard>

              {/* Morphing Icon Button Demo */}
              <EnhancedAnimatedCard
                variant="glass"
                hoverEffect="glow"
                className="p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Agent Controls</h3>
                <div className="flex justify-center">
                  <MorphingIconButton
                    icons={[
                      <Play className="w-5 h-5" />,
                      <Pause className="w-5 h-5" />,
                      <Settings className="w-5 h-5" />,
                    ]}
                    labels={['Start', 'Pause', 'Settings']}
                    activeIndex={currentIcon}
                    onIndexChange={setCurrentIcon}
                    size="lg"
                  />
                </div>
              </EnhancedAnimatedCard>

              {/* Swipeable Agent Card */}
              <SwipeableCard
                onSwipeLeft={() => addToast('warning', 'Agent Deleted', 'Agent has been removed from your dashboard.')}
                onSwipeRight={() => addToast('success', 'Agent Activated', 'Agent is now running and processing tasks.')}
                leftAction={
                  <div className="bg-red-500 text-white p-2 rounded-full">
                    Delete
                  </div>
                }
                rightAction={
                  <div className="bg-green-500 text-white p-2 rounded-full">
                    Activate
                  </div>
                }
              >
                <EnhancedAnimatedCard
                  variant="elevated"
                  hoverEffect="tilt"
                  className="p-6"
                >
                  <h3 className="text-lg font-semibold mb-2">Twitter Agent</h3>
                  <p className="text-muted-foreground mb-4">
                    Swipe left to delete or right to activate
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Status: <span className="text-green-500">Active</span></span>
                    <span>Tasks: <AnimatedCounter value={42} duration={1000} /></span>
                  </div>
                </EnhancedAnimatedCard>
              </SwipeableCard>
            </div>

            {/* Form Example */}
            <EnhancedAnimatedCard
              variant="default"
              hoverEffect="lift"
              className="p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Create New Agent</h3>
              <AnimatedForm
                staggerChildren
                showProgress
                currentStep={2}
                totalSteps={3}
                onSubmit={(e) => {
                  e.preventDefault();
                  addToast('success', 'Form Submitted!', 'Your agent configuration has been saved.');
                }}
              >
                <AnimatedInput
                  label="Agent Name"
                  placeholder="Enter agent name..."
                  showValidationIcon
                  onValidate={async (value) => {
                    // Simulate async validation
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return value.length < 3 ? 'Name must be at least 3 characters' : null;
                  }}
                />
                
                <AnimatedInput
                  label="API Key"
                  type="password"
                  placeholder="Enter your API key..."
                  hint="Your API key will be encrypted and stored securely"
                />
                
                <div className="flex gap-2 pt-4">
                  <MagneticButton
                    variant="secondary"
                    className="flex-1"
                    onClick={() => addToast('info', 'Draft Saved', 'Your changes have been saved as a draft.')}
                  >
                    Save Draft
                  </MagneticButton>
                  <MagneticButton
                    type="submit"
                    variant="premium"
                    className="flex-1"
                    glowEffect
                  >
                    Create Agent
                  </MagneticButton>
                </div>
              </AnimatedForm>
            </EnhancedAnimatedCard>

            {/* Toast Trigger Buttons */}
            <div className="flex flex-wrap gap-2">
              <MagneticButton
                size="sm"
                onClick={() => addToast('success', 'Success!', 'Operation completed successfully.')}
              >
                Success Toast
              </MagneticButton>
              <MagneticButton
                size="sm"
                variant="secondary"
                onClick={() => addToast('error', 'Error!', 'Something went wrong.')}
              >
                Error Toast
              </MagneticButton>
              <MagneticButton
                size="sm"
                variant="ghost"
                onClick={() => addToast('warning', 'Warning!', 'Please check your settings.')}
              >
                Warning Toast
              </MagneticButton>
              <MagneticButton
                size="sm"
                variant="ghost"
                onClick={() => addToast('info', 'Info', 'Here\'s some helpful information.')}
              >
                Info Toast
              </MagneticButton>
            </div>
          </div>

          {/* Modal */}
          <AnimatedModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Agent Settings"
            size="md"
            animation="scale"
          >
            <div className="space-y-4">
              <p>Configure your AI agent settings here.</p>
              <AnimatedInput
                label="Update Frequency"
                placeholder="e.g., every 5 minutes"
                floatingLabel
              />
              <div className="flex justify-end gap-2 pt-4">
                <MagneticButton
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </MagneticButton>
                <MagneticButton
                  variant="primary"
                  onClick={() => {
                    setShowModal(false);
                    addToast('success', 'Settings Updated!', 'Your agent settings have been saved.');
                  }}
                >
                  Save Changes
                </MagneticButton>
              </div>
            </div>
          </AnimatedModal>

          {/* Celebration Effect */}
          <CelebrationEffect
            trigger={showCelebration}
            type="confetti"
            intensity="high"
            duration={3000}
          />

          {/* Toast Container */}
          <ToastContainer
            toasts={toasts}
            position="top-right"
          />
        </EnhancedPageWrapper>
      </PageTransitionProvider>
    </AnimationProvider>
  );
};

// =============================================================================
// INTEGRATION INSTRUCTIONS
// =============================================================================

/**
 * To integrate the animation system into your existing app:
 * 
 * 1. Wrap your app with AnimationProvider:
 * ```tsx
 * import { AnimationProvider } from '@/components/animations';
 * 
 * function App() {
 *   return (
 *     <AnimationProvider>
 *       <YourApp />
 *     </AnimationProvider>
 *   );
 * }
 * ```
 * 
 * 2. Use PageTransitionProvider for route transitions:
 * ```tsx
 * import { PageTransitionProvider } from '@/components/animations';
 * 
 * function AppRouter() {
 *   return (
 *     <PageTransitionProvider>
 *       <Routes>
 *         <Route path="/" element={<HomePage />} />
 *         <Route path="/agents" element={<AgentsPage />} />
 *       </Routes>
 *     </PageTransitionProvider>
 *   );
 * }
 * ```
 * 
 * 3. Replace your existing components with animated versions:
 * ```tsx
 * // Before
 * <Card>
 *   <CardContent>...</CardContent>
 * </Card>
 * 
 * // After
 * <EnhancedAnimatedCard
 *   variant="premium"
 *   hoverEffect="lift"
 *   clickEffect="ripple"
 * >
 *   <CardContent>...</CardContent>
 * </EnhancedAnimatedCard>
 * ```
 * 
 * 4. Add performance monitoring (optional):
 * ```tsx
 * import { useAnimationContext } from '@/components/animations';
 * 
 * function PerformanceIndicator() {
 *   const { performanceMetrics } = useAnimationContext();
 *   
 *   return (
 *     <div>FPS: {performanceMetrics.fps}</div>
 *   );
 * }
 * ```
 * 
 * 5. Respect user preferences:
 * ```tsx
 * const { preferences, updatePreferences } = useAnimationContext();
 * 
 * // Auto-disable animations on low-end devices
 * if (preferences.performanceMode === 'auto' && performanceMetrics.fps < 30) {
 *   updatePreferences({ enableAnimations: false });
 * }
 * ```
 */

export default AnimatedAgentsPageExample;
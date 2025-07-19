import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import useAuthStore from '@/store/authStore';
import { useGoogleLogin, CredentialResponse, TokenResponse } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { loginService, googleLoginService } from '@/services/authService';
import { Brain, Mail, Lock, Sparkles, ArrowRight, AlertCircle, ChromeIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // For displaying login errors
  const [loading, setLoading] = useState(false);
  const storeLogin = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginService({ email, password });
      const loginPayload = {
        user: { id: data._id, email: data.email, fullName: data.fullName },
        token: data.token, 
      };
      storeLogin(loginPayload);
      console.log('[LoginPage] Email/Pass Login Success - Zustand store updated. Token present:', !!useAuthStore.getState().token);
      console.log('[LoginPage] Email/Pass Login Success - User:', useAuthStore.getState().user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'An unexpected error occurred during login.');
    }
    setLoading(false);
  };

  // TEMPORARY DEBUG BUTTON
  const checkStoreAfterLogin = () => {
    console.log('[LoginPage DEBUG] Checking store manually. Token present:', !!useAuthStore.getState().token);
    console.log('[LoginPage DEBUG] User:', useAuthStore.getState().user);
    alert(`Token Present: ${!!useAuthStore.getState().token}`);
  };

  const handleGoogleSuccess = async (tokenResponse: Omit<TokenResponse, "error" | "error_description" | "error_uri">) => {
    console.log('Google Sign-In (hook) Success, tokenResponse:', tokenResponse);
    setLoading(true);
    setError(null);
    try {
      // Use access_token to fetch user info from Google's userinfo endpoint
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }

      const userInfo: { email: string, name: string, sub: string, picture?: string } = await userInfoResponse.json();
      console.log('Fetched Google UserInfo:', userInfo);
      
      // Exchange Google token for our app's JWT via backend
      const authData = await googleLoginService(userInfo, tokenResponse.access_token);
      
      const googleLoginPayload = {
        user: { 
          id: authData._id,
          email: authData.email,
          fullName: authData.fullName,
        },
        token: authData.token, // Now using proper JWT from backend
      };

      storeLogin(googleLoginPayload);
      console.log('[LoginPage] Google Login Success - Zustand store updated with proper JWT. Token present:', !!useAuthStore.getState().token);
      console.log('[LoginPage] Google Login Success - User:', useAuthStore.getState().user);
      navigate('/dashboard');

    } catch (error: any) {
      console.error("Error during Google Sign-In post-processing:", error);
      setError(error.message || "An error occurred after Google Sign-In.");
    }
    setLoading(false);
  };

  const handleGoogleError = () => {
    console.error('Google Sign-In Failed');
    setError("Google Sign-In failed. Please try again or use email/password.");
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
    flow: 'implicit', // Explicitly use implicit flow for access_token
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-violet-400/20 to-purple-400/20 rounded-full blur-3xl"
          style={{ top: '20%', left: '20%' }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
          style={{ bottom: '20%', right: '20%' }}
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Floating Particles */}
      <FloatingParticles items={18} />

      {/* Main Login Card */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <GlassCard className="p-8 w-full">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex justify-center mb-4">
              <motion.div
                className="relative"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Brain className="w-12 h-12 text-violet-300" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </motion.div>
              </motion.div>
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-200 to-blue-200 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-blue-100/70">
              Sign in to your SYNAPSE account
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <Alert variant="destructive" className="glass border-red-500/30 bg-red-500/10 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-300" />
                <AlertTitle className="text-red-200 font-semibold">Login Failed</AlertTitle>
                <AlertDescription className="text-red-300/90">
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Login Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-100 font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/50 focus:border-violet-400 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-100 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-blue-200/50 focus:border-violet-400 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <AnimatedButton 
              type="submit" 
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25" 
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </AnimatedButton>
          </motion.form>

          {/* OR Separator */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-blue-300/20"></div>
            <span className="mx-4 text-blue-200/70 text-sm">OR</span>
            <div className="flex-grow border-t border-blue-300/20"></div>
          </div>

          {/* Google Sign-In Button */}
          <AnimatedButton 
            onClick={() => googleLogin()}
            variant="secondary" 
            className="w-full bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md hover:shadow-lg border border-gray-300/50"
            size="lg"
            disabled={loading}
          >
            <span className="flex items-center justify-center gap-2">
              <ChromeIcon className="w-5 h-5" /> {/* Using ChromeIcon as a stand-in for Google logo */}
              Sign in with Google
            </span>
          </AnimatedButton>

          {/* TEMPORARY DEBUG BUTTON */}
          {useAuthStore.getState().isAuthenticated && (
            <motion.div
              className="mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button onClick={checkStoreAfterLogin} variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                DEBUG: Check Auth Store
              </Button>
            </motion.div>
          )}

          {/* Register Link */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-blue-100/70 text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-violet-300 hover:text-violet-200 font-medium transition-colors">
                Create one now
              </Link>
            </p>
          </motion.div>
        </GlassCard>

        {/* Back to Home */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Link to="/" className="text-blue-200/70 hover:text-blue-100 text-sm transition-colors">
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage; 
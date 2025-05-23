import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import useAuthStore from '@/store/authStore';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { loginService } from '@/services/authService'; // Import loginService
import { Brain, Mail, Lock, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

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

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    console.log('Google Sign-In Success:', credentialResponse);
    if (credentialResponse.credential) {
      const idToken = credentialResponse.credential;
      // You would usually send this idToken to your backend for verification and to get your app's JWT
      // For now, let's decode it to see the user info (for demonstration)
      try {
        const decodedToken: { email: string, name: string, sub: string, picture?: string } = jwtDecode(idToken);
        console.log('Decoded Google ID Token:', decodedToken);
        
        // Simulate login with Google data for now
        // In a real app, your backend would do this and return your own app token
        const googleLoginPayload = {
          user: { 
            id: decodedToken.sub, // Use Google's subject ID
            email: decodedToken.email,
            fullName: decodedToken.name 
          },
          token: idToken, // Using Google's ID token as our app token for now (NOT SECURE FOR PROD)
        };
        storeLogin(googleLoginPayload);
        console.log('[LoginPage] Google Login Success - Zustand store updated. Token present:', !!useAuthStore.getState().token);
        console.log('[LoginPage] Google Login Success - User:', useAuthStore.getState().user);
        navigate('/dashboard');

      } catch (error) {
        console.error("Error decoding Google ID token:", error);
        // Handle error (e.g., show a message to the user)
      }
    } else {
      console.error('Google Sign-In Success but no credential received.');
    }
  };

  const handleGoogleError = () => {
    console.error('Google Sign-In Failed');
    // Handle error (e.g., show a message to the user)
  };

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
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-10, -50, -10],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

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
              className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
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

          {/* Divider */}
          <motion.div
            className="relative my-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-blue-200/70">
                Or continue with
              </span>
            </div>
          </motion.div>

          {/* Google Login */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
            />
          </motion.div>

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
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import useAuthStore from '@/store/authStore';
import { registerService } from '@/services/authService';
import axios from 'axios';
import { Brain, User, Mail, Lock, Sparkles, ArrowRight, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const storeLogin = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('[RegisterPage] Submitting registration for:', email);
      const data = await registerService({ fullName, email, password });
      console.log('[RegisterPage] Registration response received:', data);

      // Check if email verification is required
      if (data.requiresVerification) {
        console.log('[RegisterPage] Email verification required, showing success message');
        setRegistrationSuccess(true);
        setLoading(false);
        return;
      }

      // Legacy flow - auto login (for backward compatibility)
      if (data.token) {
        console.log('[RegisterPage] Legacy flow - auto login');
        storeLogin({
          user: { id: data._id!, email: data.email!, fullName: data.fullName },
          token: data.token,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('[RegisterPage] Registration failed:', err);
      setError(err.message || 'An unexpected error occurred during registration.');
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) return;

    console.log('[RegisterPage] Resending verification email to:', email);
    setResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      console.log('[RegisterPage] Using API base URL:', apiBaseUrl);

      const response = await axios.post(`${apiBaseUrl}/api/v1/auth/resend-verification`, {
        email: email
      });

      console.log('[RegisterPage] Resend response:', response.data);

      if (response.data.success) {
        setResendSuccess(true);
      }
    } catch (err: any) {
      console.error('[RegisterPage] Resend verification failed:', err);
      console.error('[RegisterPage] Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl"
          style={{ top: '15%', left: '15%' }}
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
          style={{ bottom: '15%', right: '15%' }}
          animate={{
            x: [0, -50, 0],
            y: [0, 30, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Floating Particles */}
      <FloatingParticles items={15} />

      {/* Main Register Card */}
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
                <Brain className="w-12 h-12 text-emerald-300" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </motion.div>
              </motion.div>
            </div>

            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-2">
              Join SYNAPSE
            </h1>
            <p className="text-teal-100/70">
              Create your account and unlock your potential
            </p>
          </motion.div>

          {/* Success Message */}
          {registrationSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-6 space-y-4"
            >
              <Alert className="glass border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                <CheckCircle className="h-4 w-4 text-emerald-300" />
                <AlertTitle className="text-emerald-200 font-semibold">Registration Successful!</AlertTitle>
                <AlertDescription className="text-emerald-300/90">
                  We've sent a verification email to <strong>{email}</strong>. Please check your inbox (and spam folder) and click the verification link to activate your account.
                  <div className="mt-2 text-xs text-emerald-400/70">
                    💡 Didn't receive it? Click the resend button below.
                  </div>
                </AlertDescription>
              </Alert>

              {resendSuccess && (
                <Alert className="glass border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                  <Mail className="h-4 w-4 text-emerald-300" />
                  <AlertTitle className="text-emerald-200 font-semibold">Email Sent!</AlertTitle>
                  <AlertDescription className="text-emerald-300/90">
                    A new verification email has been sent. Please check your inbox.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <AnimatedButton
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/25"
                  size="lg"
                >
                  {resending ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Resend Verification Email
                    </span>
                  )}
                </AnimatedButton>

                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full border-white/10 bg-white/5 text-teal-100 hover:bg-white/10"
                >
                  Back to Login
                </Button>
              </div>
            </motion.div>
          )}

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
                <AlertTitle className="text-red-200 font-semibold">Registration Failed</AlertTitle>
                <AlertDescription className="text-red-300/90">
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Register Form */}
          {!registrationSuccess && (
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-teal-100 font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-300" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-teal-200/50 focus:border-emerald-400 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-teal-100 font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-300" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-teal-200/50 focus:border-emerald-400 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-teal-100 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-300" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-teal-200/50 focus:border-emerald-400 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            <AnimatedButton 
              type="submit" 
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25" 
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
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </AnimatedButton>
          </motion.form>
          )}

          {/* Login Link */}
          {!registrationSuccess && (
          <motion.div
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-teal-100/70 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
                Sign in here
              </Link>
            </p>
          </motion.div>
          )}
        </GlassCard>

        {/* Back to Home */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Link to="/" className="text-teal-200/70 hover:text-teal-100 text-sm transition-colors">
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RegisterPage; 
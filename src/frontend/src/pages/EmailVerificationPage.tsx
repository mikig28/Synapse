import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Brain, CheckCircle, XCircle, Mail, Loader2, ArrowRight, Clock } from 'lucide-react';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import axios from 'axios';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await axios.get(`${apiBaseUrl}/api/v1/auth/verify-email/${verificationToken}`);

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setEmail(response.data.email || '');
      }
    } catch (error: any) {
      console.error('Email verification failed:', error);
      const errorData = error.response?.data;

      if (errorData?.expired) {
        setStatus('expired');
        setMessage(errorData.message || 'Verification link has expired.');
      } else {
        setStatus('error');
        setMessage(errorData?.message || 'Failed to verify email. Please try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      // Prompt user for email if we don't have it
      const userEmail = prompt('Please enter your email address:');
      if (!userEmail) return;
      setEmail(userEmail);
    }

    setResending(true);
    setResendSuccess(false);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await axios.post(`${apiBaseUrl}/api/v1/auth/resend-verification`, {
        email: email || prompt('Please enter your email address:')
      });

      if (response.data.success) {
        setResendSuccess(true);
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      console.error('Resend verification failed:', error);
      setMessage(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-16 h-16 text-emerald-300" />
              </motion.div>
            </div>
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-4">
              Verifying Your Email
            </h1>
            <p className="text-teal-100/70 text-center">
              Please wait while we verify your email address...
            </p>
          </>
        );

      case 'success':
        return (
          <>
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </motion.div>
            </div>
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-4">
              Email Verified!
            </h1>
            <p className="text-teal-100/70 text-center mb-8">
              {message || 'Your email has been verified successfully. You can now log in to your account.'}
            </p>
            <AnimatedButton
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
              size="lg"
            >
              <span className="flex items-center justify-center gap-2">
                Continue to Login
                <ArrowRight className="w-4 h-4" />
              </span>
            </AnimatedButton>
          </>
        );

      case 'expired':
        return (
          <>
            <div className="flex justify-center mb-6">
              <Clock className="w-16 h-16 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent mb-4">
              Link Expired
            </h1>
            <p className="text-teal-100/70 text-center mb-6">
              {message || 'This verification link has expired. Please request a new one.'}
            </p>

            {resendSuccess ? (
              <Alert className="glass border-emerald-500/30 bg-emerald-500/10 text-emerald-200 mb-6">
                <Mail className="h-4 w-4 text-emerald-300" />
                <AlertTitle className="text-emerald-200 font-semibold">Email Sent!</AlertTitle>
                <AlertDescription className="text-emerald-300/90">
                  Check your inbox for a new verification link.
                </AlertDescription>
              </Alert>
            ) : null}

            <AnimatedButton
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25"
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
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </span>
              )}
            </AnimatedButton>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-red-200 to-pink-200 bg-clip-text text-transparent mb-4">
              Verification Failed
            </h1>
            <p className="text-teal-100/70 text-center mb-8">
              {message || 'We could not verify your email. The link may be invalid or expired.'}
            </p>

            {resendSuccess ? (
              <Alert className="glass border-emerald-500/30 bg-emerald-500/10 text-emerald-200 mb-6">
                <Mail className="h-4 w-4 text-emerald-300" />
                <AlertTitle className="text-emerald-200 font-semibold">Email Sent!</AlertTitle>
                <AlertDescription className="text-emerald-300/90">
                  Check your inbox for a new verification link.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-3">
              <AnimatedButton
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
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
                    <Mail className="w-4 h-4" />
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
          </>
        );
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

      {/* Main Card */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <GlassCard className="p-8 w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Brain className="w-12 h-12 text-emerald-300" />
            </div>
          </div>

          {renderContent()}

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-teal-100/70 text-sm">
              Need help?{" "}
              <Link to="/" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
                Contact Support
              </Link>
            </p>
          </div>
        </GlassCard>

        {/* Back to Home */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link to="/" className="text-teal-200/70 hover:text-teal-100 text-sm transition-colors">
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage;

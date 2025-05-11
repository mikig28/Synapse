import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/store/authStore';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { loginService } from '@/services/authService'; // Import loginService

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
      storeLogin({
        user: { id: data._id, email: data.email, fullName: data.fullName },
        token: data.token,
      });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'An unexpected error occurred during login.');
    }
    setLoading(false);
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
        storeLogin({
          user: { 
            id: decodedToken.sub, // Use Google's subject ID
            email: decodedToken.email,
            fullName: decodedToken.name 
          },
          token: idToken, // Using Google's ID token as our app token for now (NOT SECURE FOR PROD)
        });
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="mx-auto grid w-[350px] gap-6 bg-card p-8 rounded-lg shadow-md">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold text-foreground">Login</h1>
          <p className="text-balance text-muted-foreground">
            Enter your email to login
          </p>
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>} {/* Display error */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap
        />

        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 
import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { useAuth } from '../context/authContext';

interface LoginProps {
  onPageChange: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onPageChange }) => {
  const { login, currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to home if already logged in
  useEffect(() => {
    if (currentUser) {
      onPageChange('home');
    }
  }, [currentUser, onPageChange]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await login();
      // User will be redirected by useEffect above
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Film className="w-12 h-12 text-indigo-400" />
            <h1 className="text-4xl font-bold text-white">
              Motion<span className="text-indigo-400">Metrics</span>
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Sign in to track your favorite movies and TV shows
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-xl p-8 shadow-2xl border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Welcome Back
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Back to browsing */}
        <div className="text-center mt-6">
          <button
            onClick={() => onPageChange('home')}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Continue browsing without signing in
          </button>
        </div>
      </div>
    </div>
  );
};
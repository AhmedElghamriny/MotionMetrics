import React, { useState } from 'react';
import { Eye, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/authContext';

interface AuthButtonProps {
  onPageChange: (page: string) => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onPageChange }) => {
  const { currentUser, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      onPageChange('home');
      window.location.reload();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="relative">
        {/* Desktop Auth Menu */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                    {currentUser.displayName?.charAt(0) || 'U'}
                </span>
            </div>
            <div className="hidden lg:block">
              <span className="text-white text-sm font-medium">
                Hello {currentUser.displayName?.split(' ')[0] || 'User'}
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              <Settings className="w-6 h-6" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-medium">
                            {currentUser.displayName?.charAt(0) || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {currentUser.displayName || 'User'}
                      </p>
                      <p className="text-slate-400 text-sm truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      onPageChange('watchlist');
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-lg transition-colors mb-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Watch List</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoading ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Auth Button */}
        <div className="md:hidden">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"
          >
            <span className="text-white text-sm font-medium">
            {currentUser.displayName?.charAt(0) || 'U'}
            </span>
          </button>
        </div>

        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onPageChange('login')}
      className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-4 py-2 rounded-lg text-white transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
    >
      <span>Sign In</span>
    </button>
  );
};
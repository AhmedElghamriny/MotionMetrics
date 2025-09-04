import React, { useState } from 'react';
import { X, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../context/authContext';

interface MobileMenuProps {
  isOpen: boolean;
  currentPage: string;
  onClose: () => void;
  onPageChange: (page: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  currentPage,
  onClose,
  onPageChange
}) => {
  const { currentUser, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'movies', label: 'Movies' },
    { id: 'tv-shows', label: 'TV Shows' },
  ];

  const handlePageChange = (page: string) => {
    onPageChange(page);
    onClose();
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      onPageChange('home');
      onClose();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden">
      <div className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white">
              Motion<span className="text-indigo-400">Metrics</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Profile Section */}
        {currentUser && (
          <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {currentUser.displayName?.charAt(0) || 'U'}
                  </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-lg truncate">
                  {currentUser.displayName || 'User'}
                </p>
                <p className="text-slate-300 text-sm truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    currentPage === item.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Auth Section */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            {currentUser ? (
              <div className="space-y-2">
                {/* Watch List Button */}
                <button
                  onClick={() => handlePageChange('watchlist')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    currentPage === 'watchlist'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-lg font-medium">Watch List</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-lg">
                    {isLoading ? 'Signing out...' : 'Sign Out'}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handlePageChange('login')}
                className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="text-lg font-medium">Sign In</span>
              </button>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          <p className="text-slate-400 text-center text-sm">
            © 2025 MotionMetrics
          </p>
        </div>
      </div>
    </div>
  );
};
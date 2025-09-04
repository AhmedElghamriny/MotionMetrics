import React, { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { Navigation } from './Navigation';
import { MobileMenu } from './MobileMenu';
import { SearchResults } from '../types';

interface HeaderProps {
  onSearch: (query: string, type: 'all' | 'movies' | 'tv') => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

// API service integrated in header
// Using relative URLs since you have a proxy set up
const searchAPI = {
  searchAll: async (query: string): Promise<SearchResults> => {
    const response = await fetch(`/data/all/search/${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },

  searchMovies: async (query: string): Promise<SearchResults> => {
    const response = await fetch(`/data/movies/search/${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },

  searchTV: async (query: string): Promise<SearchResults> => {
    const response = await fetch(`/data/tv/search/${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  }
};

export const Header: React.FC<HeaderProps> = ({ onSearch, currentPage, onPageChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Determine search type based on current page
      let searchType: 'all' | 'movies' | 'tv' = 'all';
      if (currentPage === 'movies') {
        searchType = 'movies';
      } else if (currentPage === 'tv-shows') {
        searchType = 'tv';
      }
      
      // Call the parent's onSearch handler
      onSearch(searchQuery, searchType);
      setIsSearchOpen(false);
      setSearchQuery(''); // Clear search after submitting
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      setIsSearchOpen(false);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const getPlaceholderText = () => {
    switch (currentPage) {
      case 'movies':
        return 'Search Movies...';
      case 'tv-shows':
        return 'Search TV shows...';
      default:
        return 'Search Movies & TV shows...';
    }
  };

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button 
              onClick={() => onPageChange('home')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <h1 className="text-2xl font-bold text-white">
                motionmetrics
              </h1>
            </button>

            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center space-x-2 flex-1 max-w-md mx-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={getPlaceholderText()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Search
              </button>
            </form>

            {/* Mobile Controls */}
            <div className="flex items-center space-x-3 md:hidden">
              <button
                onClick={toggleSearch}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Navigation */}
            <Navigation currentPage={currentPage} onPageChange={onPageChange} />
          </div>

          {/* Mobile Search */}
          {isSearchOpen && (
            <div className="mt-4 md:hidden">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={getPlaceholderText()}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-20 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                    >
                      Go
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        currentPage={currentPage}
        onClose={() => setIsMobileMenuOpen(false)}
        onPageChange={onPageChange}
      />
    </>
  );
};

// Export the search API functions for use in parent components
export { searchAPI };
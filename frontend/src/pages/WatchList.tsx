import React, { useState, useEffect } from 'react';
import { Star, Calendar, Trash2, Film, Tv, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/authContext';
import { WatchlistService, WatchlistItem } from '../services/Watchlist';

interface WatchlistProps {
  onContentClick?: (contentId: string, contentType: 'movie' | 'tv') => void;
}

export const WatchList: React.FC<WatchlistProps> = ({ onContentClick }) => {
  const { currentUser } = useAuth();
  const [movies, setMovies] = useState<WatchlistItem[]>([]);
  const [tvShows, setTvShows] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'tv'>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadWatchlist();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadWatchlist = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { movies, tvShows } = await WatchlistService.getAllWatchlistItems(currentUser.uid);
      setMovies(movies);
      setTvShows(tvShows);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      setError('Failed to load watchlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async (item: WatchlistItem) => {
    if (!currentUser) return;
    
    setRemovingId(item.id);
    setError(null);
    
    try {
      await WatchlistService.removeFromWatchlist(currentUser.uid, item.id);
      
      // Update local state
      if (item.type === 'movie') {
        setMovies(prev => prev.filter(movie => movie.id !== item.id));
      } else {
        setTvShows(prev => prev.filter(show => show.id !== item.id));
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      setError('Failed to remove item. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleItemClick = (item: WatchlistItem) => {
    if (onContentClick) {
      onContentClick(item.id, item.type);
    }
  };

  const handleRefresh = () => {
    loadWatchlist();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-slate-400">Please sign in to view your watchlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-white">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading your watchlist...</span>
        </div>
      </div>
    );
  }

  const allItems = [...movies, ...tvShows].sort((a, b) => 
    new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'movies': return movies;
      case 'tv': return tvShows;
      default: return allItems;
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Watchlist</h1>
              <p className="text-slate-400">
                {allItems.length} {allItems.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1 mb-8 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-300 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            All ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab('movies')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'movies'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Movies ({movies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tv')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'tv'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>TV Shows ({tvShows.length})</span>
          </button>
        </div>

        {/* Watchlist Items */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-600 mb-4">
              <Film className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Your {activeTab === 'all' ? 'watchlist' : activeTab} is empty
            </h2>
            <p className="text-slate-400">
              Start adding {activeTab === 'all' ? 'movies and TV shows' : activeTab} you want to watch later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div 
                key={`${item.type}-${item.id}`}
                className="group bg-slate-800/50 rounded-xl overflow-hidden hover:bg-slate-800/70 transition-all duration-300 hover:scale-105"
              >
                {/* Poster */}
                <div 
                  className="relative aspect-[2/3] overflow-hidden cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image';
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                  
                  {/* Content Type Badge */}
                  <div className="absolute top-3 left-3">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                      item.type === 'movie' 
                        ? 'bg-blue-600/80 text-blue-200' 
                        : 'bg-purple-600/80 text-purple-200'
                    }`}>
                      {item.type === 'movie' ? (
                        <Film className="w-3 h-3" />
                      ) : (
                        <Tv className="w-3 h-3" />
                      )}
                      <span className="capitalize">{item.type}</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromWatchlist(item);
                    }}
                    disabled={removingId === item.id}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-full disabled:opacity-50"
                    title="Remove from watchlist"
                  >
                    {removingId === item.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Content Info */}
                <div className="p-4">
                  <h3 
                    className="font-semibold text-white mb-2 line-clamp-2 cursor-pointer hover:text-indigo-400 transition-colors"
                    onClick={() => handleItemClick(item)}
                    title={item.title}
                  >
                    {item.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{item.year || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{item.rating}/10</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500" title={`Added on ${item.addedAt.toLocaleDateString()}`}>
                    Added {item.addedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
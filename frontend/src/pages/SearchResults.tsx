import React from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SearchResults, MediaItem, Content, Movie, TVShow } from '../types';
import { ContentCard } from '../components';

interface SearchResultsPageProps {
  results: SearchResults | null;
  searchQuery: string;
  searchType: 'all' | 'movies' | 'tv';
  isLoading: boolean;
  error: string | null;
  onItemClick: (item: Content, creditsData?: any, detailsData?: any, recommendations?: (Movie | TVShow)[]) => void;
  onBackToHome: () => void;
}

// Utility function to round numbers to specified decimal places
function roundToDecimal(num: number, decimalPlaces: number) {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(num * multiplier) / multiplier;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  results,
  searchQuery,
  searchType,
  isLoading,
  error,
  onItemClick,
  onBackToHome
}) => {
  const POSTER_URL = "https://image.tmdb.org/t/p/original";

  // Helper function to convert MediaItem to Content
  const convertToContent = (item: MediaItem): Content => {
    const title = item.title || item.name || 'Unknown Title';
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();
    const poster = item.poster_path 
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : '/api/placeholder/300/450';
    const backdrop = item.backdrop_path
      ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
      : poster;
    
    const baseContent = {
      id: item.id.toString(),
      title,
      genre: [], // Will need to map genre_ids to actual genre names
      rating: Math.round(item.vote_average * 10) / 10,
      year,
      description: item.overview || 'No description available',
      poster,
      backdrop,
      cast: [] // Not available in search results
    };

    // Determine if it's a movie or TV show
    const isMovie = item.media_type === 'movie' || item.title;
    
    if (isMovie) {
      return {
        ...baseContent,
        type: 'movie' as const,
        duration: 120, // Default duration, would need additional API call for real data
        director: 'Unknown' // Would need additional API call for real data
      };
    } else {
      return {
        ...baseContent,
        type: 'tv' as const,
        creator: 'Unknown', // Would need additional API call for real data
        seasons: 1, // Default, would need additional API call for real data
        episodes: 1, // Default, would need additional API call for real data
        episodeDuration: 45 // Default episode duration
      };
    }
  };

  const handleContentClick = async (content: Content) => {
    window.scrollTo(0, 0);

    // Get recommendations based on content type
    let recommendations: (Movie | TVShow)[] = [];
    
    if (content.type === 'movie') {
      // Get movie recommendations
      try {
        const recommendationsResponse = await fetch('/api/movie-clicked', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ movie_id: content.id })
        });
        
        const recommendationsData = await recommendationsResponse.json();

        if (recommendationsData.status === "success" && recommendationsData.recommendations) {
          // Fetch full movie details for each recommendation ID
          const movieDetailsPromises = recommendationsData.recommendations.map(async (movieId: number) => {
            try {
              const response = await fetch(`/data/movies/${movieId}/details`);
              const movieData = await response.json();
              return movieData;
            } catch (error) {
              console.warn(`Error fetching details for movie ${movieId}:`, error);
              return null;
            }
          });

          const movieDetails = await Promise.all(movieDetailsPromises);
          
          // Convert to Movie type, filtering out any failed requests
          recommendations = movieDetails
            .filter(movie => movie !== null)
            .map((rec: any) => {
              let year = 0;
              if (rec.release_date) {
                try {
                  year = new Date(rec.release_date).getFullYear();
                } catch (error) {
                  console.warn('Error parsing release date:', rec.release_date);
                  year = 0;
                }
              }

              const movie: Movie = {
                id: rec.id.toString(),
                title: rec.title || 'Unknown Title',
                type: 'movie' as const,
                genre: [],
                rating: roundToDecimal(rec.vote_average || 0, 1),
                year: year,
                description: rec.overview || 'No description available',
                poster: rec.poster_path ? `${POSTER_URL}${rec.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
                backdrop: rec.backdrop_path ? `${POSTER_URL}${rec.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
                cast: [], 
                duration: 0, 
                director: ''
              };
            
              return movie;
            });
        }
      } catch (error) {
        console.error('Error fetching movie recommendations:', error);
      }
    } else if (content.type === 'tv') {
      // Get TV show recommendations
      try {
        const recommendationsResponse = await fetch('/api/show-clicked', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ show_id: content.id })
        });
        
        const recommendationsData = await recommendationsResponse.json();

        if (recommendationsData.status === "success" && recommendationsData.recommendations) {
          // Fetch full show details for each recommendation ID
          const showDetailsPromises = recommendationsData.recommendations.map(async (showId: number) => {
            try {
              const response = await fetch(`/data/tv/${showId}/details`);
              const showData = await response.json();
              return showData;
            } catch (error) {
              console.warn(`Error fetching details for show ${showId}:`, error);
              return null;
            }
          });

          const showDetails = await Promise.all(showDetailsPromises);
          
          // Convert to TVShow type, filtering out any failed requests
          recommendations = showDetails
            .filter(show => show !== null)
            .map((rec: any) => {
              let year = 0;
              if (rec.first_air_date) {
                try {
                  year = new Date(rec.first_air_date).getFullYear();
                } catch (error) {
                  console.warn('Error parsing first air date:', rec.first_air_date);
                  year = 0;
                }
              }

              const tvShow: TVShow = {
                id: rec.id.toString(),
                title: rec.name || rec.original_name || 'Unknown Title',
                type: 'tv' as const,
                genre: [],
                rating: roundToDecimal(rec.vote_average || 0, 1),
                year: year,
                description: rec.overview || 'No description available',
                poster: rec.poster_path ? `${POSTER_URL}${rec.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
                backdrop: rec.backdrop_path ? `${POSTER_URL}${rec.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
                cast: [], 
                creator: '',
                seasons: 0,
                episodes: 0,
                episodeDuration: 0,
              };
            
              return tvShow;
            });
        }
      } catch (error) {
        console.error('Error fetching TV show recommendations:', error);
      }
    }

    // Fetch both credits and details when content is clicked
    const creditsUrl = content.type === 'movie' 
      ? `/data/movies/${content.id}/credits`
      : `/data/tv/${content.id}/credits`;
    const detailsUrl = content.type === 'movie' 
      ? `/data/movies/${content.id}/details`
      : `/data/tv/${content.id}/details`;
    
    try {
      const creditsResponse = await fetch(creditsUrl);
      const creditsData = await creditsResponse.json();
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      onItemClick(content, creditsData, detailsData, recommendations);
    } catch (error) {
      console.error('Error fetching content details:', error);
      // Still call onItemClick with just the content and recommendations if API calls fail
      onItemClick(content, null, null, recommendations);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <span className="loader"></span>
              <p className="text-slate-400">Searching for "{searchQuery}"...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={onBackToHome}
            className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="text-center py-20">
            <div className="text-red-500 mb-4">
              <X className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Search Error</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <button
              onClick={onBackToHome}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getSearchTypeLabel = () => {
    switch (searchType) {
      case 'movies': return 'Movies';
      case 'tv': return 'TV Shows';
      default: return 'Movies & TV Shows';
    }
  };

  // Filter out people from results and convert to Content format
  const filteredResults = results?.results
    .filter(item => item.media_type !== 'person' && (item.title || item.name))
    .map(convertToContent) || [];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBackToHome}
            className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <Search className="w-6 h-6 text-indigo-400" />
            <h1 className="text-3xl font-bold">Search Results</h1>
          </div>
          
          <div className="text-slate-400">
            <p className="text-lg mb-1">
              Showing <span className="text-white font-semibold">{getSearchTypeLabel()}</span> for 
              <span className="text-indigo-400 font-semibold"> "{searchQuery}"</span>
            </p>
            {results && (
              <p className="text-sm">
                {filteredResults.length} of {results.total_results} results 
                {results.total_pages > 1 && ` • Page ${results.page} of ${results.total_pages}`}
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {filteredResults.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-slate-600 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Results Found</h2>
            <p className="text-slate-400 mb-6">
              We couldn't find any {getSearchTypeLabel().toLowerCase()} matching "{searchQuery}"
            </p>
            <div className="space-y-2 text-slate-500 text-sm">
              <p>Try:</p>
              <ul className="space-y-1">
                <li>• Checking your spelling</li>
                <li>• Using different keywords</li>
                <li>• Searching for a more general term</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-12 lg:gap-20 xl:gap-40 justify-items-center">
            {filteredResults.map((content) => (
              <ContentCard
                key={`${content.type}-${content.id}`}
                content={content}
                onClick={handleContentClick}
              />
            ))}
          </div>
        )}

        {/* Pagination Info */}
        {results && results.total_pages > 1 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-4 bg-slate-800 rounded-lg px-6 py-3">
              <button className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-slate-300">
                Page {results.page} of {results.total_pages}
              </span>
              <button className="text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
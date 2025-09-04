import React, { useState, useEffect } from 'react';
import { Star, Calendar, Clock, Plus, Check } from 'lucide-react';
import { Content, Movie, TVShow } from '../types';
import { useAuth } from '../context/authContext';
import { WatchlistService } from '../services/Watchlist';

interface Actor {
  id: string;
  real_name: string;
  character_name: string;
  poster: string;
}

interface Crew {
  id: string;
  real_name: string;
  poster: string;
}

interface ContentDetailsProps {
  content: Content | null;
  creditsData?: any;
  detailsData?: any;
  recommendations?: (Movie | TVShow)[];
  onBack: () => void;
  onContentClick: (content: Content, creditsData?: any, detailsData?: any, recommendations?: (Movie | TVShow)[]) => void;
}

export const ContentDetails: React.FC<ContentDetailsProps> = ({
  content,
  creditsData,
  detailsData,
  recommendations = [],
  onBack,
  onContentClick
}) => {
  const { currentUser } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [clickedContentTitle, setClickedContentTitle] = useState<string>('');

  // Check if item is in watchlist when component mounts or content changes
  useEffect(() => {
    const checkWatchlistStatus = async () => {
      if (currentUser && content) {
        try {
          // FIXED: Remove the third parameter (content.type)
          const inWatchlist = await WatchlistService.isInWatchlist(
            currentUser.uid,
            content.id
          );
          setIsInWatchlist(inWatchlist);
        } catch (error) {
          console.error('Error checking watchlist status:', error);
        }
      }
    };
    checkWatchlistStatus();
  }, [currentUser, content]);

  const handleWatchlistToggle = async () => {
    if (!currentUser || !content) {
      alert('Please sign in to add items to your watchlist');
      return;
    }

    setIsLoading(true);
    try {
      if (isInWatchlist) {
        // FIXED: Remove the third parameter (content.type)
        await WatchlistService.removeFromWatchlist(
          currentUser.uid,
          content.id
        );
        setIsInWatchlist(false);
        console.log(`Removed "${content.title}" from watchlist`);
      } else {
        await WatchlistService.addToWatchlist(currentUser.uid, content);
        setIsInWatchlist(true);
        console.log(`Added "${content.title}" to watchlist`);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      alert('Failed to update watchlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!content) return null;

  // Type guards for better type safety
  const isMovie = (item: Content): item is Movie => item.type === 'movie';
  const isTVShow = (item: Content): item is TVShow => item.type === 'tv';

  const CHARACTER_POSTER_URL = "https://image.tmdb.org/t/p/original";
  
  // Default poster images
  const DEFAULT_PERSON_POSTER = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/No-Image-Placeholder-landscape.svg/512px-No-Image-Placeholder-landscape.svg.png";
  const DEFAULT_BACKDROP = "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
  
  // Helper function to get poster URL with fallback
  const getPosterUrl = (posterPath: string | null | undefined): string => {
    if (posterPath && posterPath.trim() !== '') {
      return `${CHARACTER_POSTER_URL}${posterPath}`;
    }
    return DEFAULT_PERSON_POSTER;
  };

  // Helper function to get backdrop URL with fallback
  const getBackdropUrl = (backdropPath: string | null | undefined): string => {
    if (backdropPath && backdropPath.trim() !== '') {
      return backdropPath;
    }
    return DEFAULT_BACKDROP;
  };

  // Process credits data with default poster handling
  const actors: Actor[] = creditsData?.cast?.slice(0, 10).map((actor: any) => ({
    id: actor.id.toString(),
    real_name: actor.name,
    character_name: actor.character,
    poster: getPosterUrl(actor.profile_path)
  })) || [];

  const directors: Crew[] = creditsData?.crew?.filter((person: any) => person.job === 'Director').map((director: any) => ({
    id: director.id.toString(),
    real_name: director.name,
    poster: getPosterUrl(director.profile_path)
  })) || [];

  const producers: Crew[] = creditsData?.crew?.filter((person: any) => person.job === 'Producer' || person.job === 'Executive Producer').slice(0, 8).map((producer: any) => ({
    id: producer.id.toString(),
    real_name: producer.name,
    poster: getPosterUrl(producer.profile_path)
  })) || [];

  // Process details data
  const genres = detailsData?.genres?.map((genre: any) => genre.name) || [];
  const voteCount = detailsData?.vote_count || 0;
  const runtime = detailsData?.runtime || 0;
  const numberOfSeasons = detailsData?.number_of_seasons || 0;
  const numberOfEpisodes = detailsData?.number_of_episodes || 0;
  
  // Production companies (publishers)
  const publishers = detailsData?.production_companies?.map((company: any) => company.name) || [];
  
  // Networks for TV shows
  const networks = detailsData?.networks?.map((network: any) => network.name) || [];

  // Handle recommendation clicks for movies
  const handleMovieRecommendationClick = async (recommendedMovie: Movie) => {
    window.scrollTo(0, 0);
    
    try {
      // Fetch recommendations first
      const recommendationsResponse = await fetch('/api/movie-clicked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movie_id: recommendedMovie.id })
      });
      
      const recommendationsData = await recommendationsResponse.json();
      let newRecommendations: Movie[] = [];
      
      if (recommendationsData.status === "success" && recommendationsData.recommendations) {
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
        const POSTER_URL = "https://image.tmdb.org/t/p/original";
        
        newRecommendations = movieDetails
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
            return {
              id: rec.id.toString(),
              title: rec.title || 'Unknown Title',
              type: 'movie' as const,
              genre: [],
              rating: Math.round((rec.vote_average || 0) * 10) / 10,
              year: year,
              description: rec.overview || 'No description available',
              poster: rec.poster_path ? `${POSTER_URL}${rec.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
              backdrop: rec.backdrop_path ? `${POSTER_URL}${rec.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
              cast: [], 
              duration: 0, 
              director: ''
            };
          });
      }

      const uniqueNewRecommendations = newRecommendations.filter((movie, index, self) => 
        index === self.findIndex(m => m.id === movie.id)
      );
      
      // Fetch credits and details
      const [creditsResponse, detailsResponse] = await Promise.all([
        fetch(`/data/movies/${recommendedMovie.id}/credits`),
        fetch(`/data/movies/${recommendedMovie.id}/details`)
      ]);
      
      const newCreditsData = await creditsResponse.json();
      const newDetailsData = await detailsResponse.json();
      
      // Call onContentClick with all the data
      if (onContentClick) {
        onContentClick(recommendedMovie, newCreditsData, newDetailsData, uniqueNewRecommendations);
      }
      
    } catch (error) {
      console.error('Error loading movie recommendation:', error);
      
      // Fallback: try to load basic data without recommendations
      try {
        const [creditsResponse, detailsResponse] = await Promise.all([
          fetch(`/data/movies/${recommendedMovie.id}/credits`),
          fetch(`/data/movies/${recommendedMovie.id}/details`)
        ]);
        
        const newCreditsData = await creditsResponse.json();
        const newDetailsData = await detailsResponse.json();
        
        if (onContentClick) {
          onContentClick(recommendedMovie, newCreditsData, newDetailsData, []);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Failed to load movie details. Please try again.');
      }
    }
  };

  // Handle recommendation clicks for TV shows
  const handleTVShowRecommendationClick = async (recommendedShow: TVShow) => {
    window.scrollTo(0, 0);
    
    try {
      // Fetch recommendations first
      const recommendationsResponse = await fetch('/api/show-clicked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ show_id: recommendedShow.id })
      });
      
      const recommendationsData = await recommendationsResponse.json();
      let newRecommendations: TVShow[] = [];
      
      if (recommendationsData.status === "success" && recommendationsData.recommendations) {
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
        const POSTER_URL = "https://image.tmdb.org/t/p/original";
        
        newRecommendations = showDetails
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
            return {
              id: rec.id.toString(),
              title: rec.name || rec.original_name || 'Unknown Title',
              type: 'tv' as const,
              genre: [],
              rating: Math.round((rec.vote_average || 0) * 10) / 10,
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
          });
      }

      const uniqueNewRecommendations = newRecommendations.filter((show, index, self) => 
        index === self.findIndex(s => s.id === show.id)
      );
      
      // Fetch credits and details
      const [creditsResponse, detailsResponse] = await Promise.all([
        fetch(`/data/tv/${recommendedShow.id}/credits`),
        fetch(`/data/tv/${recommendedShow.id}/details`)
      ]);
      
      const newCreditsData = await creditsResponse.json();
      const newDetailsData = await detailsResponse.json();
      
      // Call onContentClick with all the data
      if (onContentClick) {
        onContentClick(recommendedShow, newCreditsData, newDetailsData, uniqueNewRecommendations);
      }
      
    } catch (error) {
      console.error('Error loading TV show recommendation:', error);
      
      // Fallback: try to load basic data without recommendations
      try {
        const [creditsResponse, detailsResponse] = await Promise.all([
          fetch(`/data/tv/${recommendedShow.id}/credits`),
          fetch(`/data/tv/${recommendedShow.id}/details`)
        ]);
        
        const newCreditsData = await creditsResponse.json();
        const newDetailsData = await detailsResponse.json();
        
        if (onContentClick) {
          onContentClick(recommendedShow, newCreditsData, newDetailsData, []);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Failed to load TV show details. Please try again.');
      }
    }
  };

  // Generic handler that determines content type and calls appropriate function
  const handleRecommendationClick = async (recommendation: Movie | TVShow) => {
    // Set loading state
    setContentLoading(true);
    setClickedContentTitle(recommendation.title);
    
    try {
      if (isMovie(recommendation)) {
        await handleMovieRecommendationClick(recommendation);
      } else {
        await handleTVShowRecommendationClick(recommendation);
      }
    } catch (error) {
      console.error('Error in handleRecommendationClick:', error);
      alert('Failed to load content details. Please try again.');
    } finally {
      // Always clear loading state
      setContentLoading(false);
    }
  };

  if (contentLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <span className="loader"></span>
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">Loading Content Details</h2>
          <p className="text-slate-400 text-lg">
            Getting information for "{clickedContentTitle}"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Back Button */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={()=> {
                onBack();
                window.scrollTo(0, 0);
            }}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
          >
            <span>Go Back</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
        <img
          src={getBackdropUrl(content.backdrop)}
          alt={content.title}
          className="w-full h-full object-center"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_BACKDROP;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
          <div className="container mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {content.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-white mb-6">
              <div className="flex items-center space-x-1">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-semibold">{content.rating}</span>
                <span className="text-slate-400">({voteCount} votes)</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-5 h-5" />
                <span>{content.year}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-5 h-5" />
                <span>
                  {isMovie(content) 
                    ? `${runtime} min` 
                    : `${numberOfSeasons} seasons`
                  }
                </span>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={handleWatchlistToggle}
                disabled={isLoading || !currentUser}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isInWatchlist 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } ${!currentUser ? 'bg-slate-600 hover:bg-slate-500' : ''}`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isInWatchlist ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                <span>
                  {isLoading 
                    ? 'Loading...' 
                    : isInWatchlist 
                      ? 'Added to List' 
                      : !currentUser 
                        ? 'Sign in to Add'
                        : 'Add to List'
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Details */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                {content.description}
              </p>
            </div>

            {/* Directors (Movies) */}
            {isMovie(content) && directors.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Director{directors.length > 1 ? 's' : ''}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {directors.map((director) => (
                    <div key={director.id} className="text-center">
                      <div className="w-full h-48 bg-slate-800 rounded-lg overflow-hidden mb-2">
                        <img 
                          src={director.poster} 
                          alt={director.real_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_PERSON_POSTER;
                          }}
                        />
                      </div>
                      <h4 className="text-white text-sm font-semibold">{director.real_name}</h4>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cast */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <span>Cast</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {actors.map((actor) => (
                  <div key={actor.id} className="text-center">
                    <div className="w-full h-48 bg-slate-800 rounded-lg overflow-hidden mb-2">
                      <img 
                        src={actor.poster} 
                        alt={actor.real_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PERSON_POSTER;
                        }}
                      />
                    </div>
                    <h4 className="text-white text-sm font-semibold mb-1">{actor.real_name}</h4>
                    <p className="text-slate-400 text-xs">{actor.character_name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Producers (TV Shows only) */}
            {isTVShow(content) && producers.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Producer{producers.length > 1 ? 's' : ''}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {producers.map((producer) => (
                    <div key={producer.id} className="text-center">
                      <div className="w-full h-48 bg-slate-800 rounded-lg overflow-hidden mb-2">
                        <img 
                          src={producer.poster} 
                          alt={producer.real_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_PERSON_POSTER;
                          }}
                        />
                      </div>
                      <h4 className="text-white text-sm font-semibold">{producer.real_name}</h4>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Genres */}
            <div>
              <h3 className="text-xl font-bold text-white mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-indigo-600/20 text-indigo-400 rounded-full text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Publishers/Production Companies */}
            {publishers.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Publishers</h3>
                <div className="flex flex-wrap gap-2">
                  {publishers.map((publisher: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg text-sm"
                    >
                      {publisher}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Networks (TV Shows only) */}
            {isTVShow(content) && networks.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Networks</h3>
                <div className="flex flex-wrap gap-2">
                  {networks.map((network: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm"
                    >
                      {network}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TV Show-specific: Details */}
            {isTVShow(content) && (
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Seasons:</span>
                  <span className="text-white font-semibold">{numberOfSeasons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Episodes:</span>
                  <span className="text-white font-semibold">{numberOfEpisodes}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations Section */}
        {recommendations && recommendations.length > 0 ? (
          <div className="mt-12 pt-8 border-t border-slate-800">
            <h2 className="text-3xl font-bold text-white mb-6">More Like This</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {recommendations.map((recommendation, index) => {
                return (
                  <div 
                    key={`${recommendation.id}-${index}`}
                    className="group cursor-pointer transition-transform duration-300 hover:scale-105"
                    onClick={() => handleRecommendationClick(recommendation)}
                  >
                    <div className="relative overflow-hidden rounded-xl bg-slate-800">
                      <img
                        src={recommendation.poster}
                        alt={recommendation.title}
                        className="w-full h-80 md:h-96 lg:h-112 object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          console.warn('Image failed to load:', recommendation.poster);
                          e.currentTarget.src = 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{recommendation.title}</h3>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>{recommendation.year || 'Unknown'}</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{recommendation.rating}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 capitalize">
                          {recommendation.type}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-12 pt-8 border-t border-slate-800">
            <h2 className="text-3xl font-bold text-white mb-6">More Like This</h2>
            <div className="text-slate-400 text-center py-8">
              <p>No recommendations available at the moment.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
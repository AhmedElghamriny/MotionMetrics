import React, { useState, useEffect } from 'react';
import { ContentSection } from '../components/ContentSection';
import { Content, Movie, TVShow } from '../types';
import { WatchlistService } from '../services/Watchlist';
import { useAuth } from "../context/authContext";

interface HomepageProps {
  onContentClick?: (content: Content, creditsData?: any, detailsData?: any, recommendations?: (Movie | TVShow)[]) => void;
  userId?: string;
}

function roundToDecimal(num: number, decimalPlaces: number) {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(num * multiplier) / multiplier;
}

export const Homepage: React.FC<HomepageProps> = ({ onContentClick }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const [trendingContent, setTrendingContent] = useState<Content[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<Content[]>([]);
  const [airingTodayShows, setAiringTodayShows] = useState<Content[]>([]);
  const [recommendationsContent, setRecommendationsContent] = useState<Content[]>([]);
  const [featuredContent, setFeaturedContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [clickedContentTitle, setClickedContentTitle] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, nowPlayingData, airingTodayData] = await Promise.all([
          fetch("/data/all").then(res => res.json()),
          fetch("/data/movies/now_playing").then(res => res.json()),
          fetch("/data/tv/airing_today").then(res => res.json())
        ]);

        const convertedTrendingContent = trendingData.results?.map(convertToContent) || [];
        setTrendingContent(convertedTrendingContent);
        
        const convertedNowPlayingMovies = nowPlayingData.results?.map((item: any) => convertToMovie(item)) || [];
        setNowPlayingMovies(convertedNowPlayingMovies);
        
        const convertedAiringTodayShows = airingTodayData.results?.map((item: any) => convertToTVShow(item)) || [];
        setAiringTodayShows(convertedAiringTodayShows);
        
        if (convertedTrendingContent.length > 0) {
          setFeaturedContent(convertedTrendingContent[0]);
        }

        if (userId) {
          console.log('UserId provided, fetching watchlist recommendations...');
          await fetchWatchlistRecommendations(userId);
        } else {
          console.log('No userId provided, skipping watchlist recommendations');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const fetchWatchlistRecommendations = async (userId: string) => {
    try {
      const { movies, tvShows } = await WatchlistService.getAllWatchlistItems(userId);
      
      if (movies.length === 0 && tvShows.length === 0) {
        console.log("No items in watchlist");
        return;
      }

      let allRecommendations: Content[] = [];

      if (movies.length > 0) {
        try {
          const movieResponse = await fetch("/api/watchlist-recommendations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ watchlist: movies }),
          });

          const movieData = await movieResponse.json();
          if (movieData.status === "success" && movieData.recommendations) {
            const movieRecommendationDetails = await Promise.all(
              movieData.recommendations.map(async (id: number) => {
                try {
                  const response = await fetch(`/data/movies/${id}/details`);
                  const movieData = await response.json();
                  
                  if (response.ok && movieData.success !== false) {
                    return convertToMovie({ ...movieData, media_type: "movie" });
                  }
                  return null;
                } catch (err) {
                  console.warn(`Error fetching movie details for ${id}:`, err);
                  return null;
                }
              })
            );

            const validMovieRecommendations = movieRecommendationDetails.filter(Boolean) as Movie[];
            allRecommendations.push(...validMovieRecommendations);
          }
        } catch (error) {
          console.error("Error fetching movie recommendations:", error);
        }
      }

      if (tvShows.length > 0) {
        try {
          const tvResponse = await fetch("/api/watchlist-recommendations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ watchlist: tvShows }),
          });

          const tvData = await tvResponse.json();
          if (tvData.status === "success" && tvData.recommendations) {
            const tvRecommendationDetails = await Promise.all(
              tvData.recommendations.map(async (id: number) => {
                try {
                  const response = await fetch(`/data/tv/${id}/details`);
                  const showData = await response.json();
                  
                  if (response.ok && showData.success !== false) {
                    return convertToTVShow({ ...showData, media_type: "tv" });
                  }
                  return null;
                } catch (err) {
                  console.warn(`Error fetching TV show details for ${id}:`, err);
                  return null;
                }
              })
            );

            const validTvRecommendations = tvRecommendationDetails.filter(Boolean) as TVShow[];
            allRecommendations.push(...validTvRecommendations);
          }
        } catch (error) {
          console.error("Error fetching TV show recommendations:", error);
        }
      }

      const uniqueRecommendations = allRecommendations.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id && t.type === item.type)
      );
      
      setRecommendationsContent(uniqueRecommendations);
      
    } catch (error) {
      console.error("Error fetching watchlist recommendations:", error);
    }
  };

  const POSTER_URL = "https://image.tmdb.org/t/p/original";
  
  const convertToContent = (item: any): Content => {
    const isMovie = item.media_type === 'movie';
    const title = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
    const releaseDate = isMovie ? item.release_date : item.first_air_date;
    
    const baseContent = {
      id: item.id.toString(),
      title,
      type: isMovie ? 'movie' as const : 'tv' as const,
      genre: [],
      rating: roundToDecimal(item.vote_average, 1),
      year: releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear(),
      description: item.overview || '',
      poster: item.poster_path ? `${POSTER_URL}${item.poster_path}` : '',
      backdrop: item.backdrop_path ? `${POSTER_URL}${item.backdrop_path}` : '',
      cast: [],
    };

    if (isMovie) {
      return {
        ...baseContent,
        director: '',
        duration: 0,
      } as Movie;
    } else {
      return {
        ...baseContent,
        creator: '',
        seasons: 0,
        episodes: 0,
        episodeDuration: 0,
      } as TVShow;
    }
  };

  const convertToMovie = (item: any): Movie => {
    return {
      id: item.id.toString(),
      title: item.title || item.original_title,
      type: 'movie' as const,
      genre: [],
      rating: roundToDecimal(item.vote_average, 1),
      year: item.release_date ? new Date(item.release_date).getFullYear() : new Date().getFullYear(),
      description: item.overview || '',
      poster: item.poster_path ? `${POSTER_URL}${item.poster_path}` : '',
      backdrop: item.backdrop_path ? `${POSTER_URL}${item.backdrop_path}` : '',
      cast: [],
      director: '',
      duration: 0,
    };
  };

  const convertToTVShow = (item: any): TVShow => {
    return {
      id: item.id.toString(),
      title: item.name || item.original_name,
      type: 'tv' as const,
      genre: [],
      rating: roundToDecimal(item.vote_average, 1),
      year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : new Date().getFullYear(),
      description: item.overview || '',
      poster: item.poster_path ? `${POSTER_URL}${item.poster_path}` : '',
      backdrop: item.backdrop_path ? `${POSTER_URL}${item.backdrop_path}` : '',
      cast: [],
      creator: '',
      seasons: 0,
      episodes: 0,
      episodeDuration: 0,
    };
  };

  const handleContentClick = async (content: Content) => {
    // Show loading screen immediately
    setContentLoading(true);
    setClickedContentTitle(content.title);
    
    window.scrollTo(0, 0);

    try {
      let recommendations: (Movie | TVShow)[] = [];
      
      if (content.type === 'movie') {
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

      const creditsUrl = content.type === 'movie' 
        ? `/data/movies/${content.id}/credits`
        : `/data/tv/${content.id}/credits`;
      const detailsUrl = content.type === 'movie' 
        ? `/data/movies/${content.id}/details`
        : `/data/tv/${content.id}/details`;
      
      const creditsResponse = await fetch(creditsUrl);
      const creditsData = await creditsResponse.json();
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      // Hide loading screen before calling onContentClick
      setContentLoading(false);

      if (onContentClick) {
        onContentClick(content, creditsData, detailsData, recommendations);
      }
    } catch (error) {
      console.error('Error in handleContentClick:', error);
      setContentLoading(false);
    }
  };

  const handleWatchClick = () => {
    alert('Watch functionality would be implemented here!');
  };

  const handleInfoClick = () => {
    if (featuredContent) {
      handleContentClick(featuredContent);
    }
  };

  // Show content loading screen
  if (contentLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <span className="loader"></span>
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">Loading Details</h2>
          <p className="text-slate-400 text-lg">
            Getting information for "{clickedContentTitle}"
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Welcome</h1>
            <p className="text-slate-400 text-lg">
              Discover trending movies and TV shows <span className='text-slate-500'>(Updated Daily)</span>
            </p>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <span className="loader"></span>
              <div className="text-white text-xl">Loading content...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-12">
        {recommendationsContent.length > 0 && (
          <ContentSection
            title="Based on your watch list"
            content={recommendationsContent}
            onContentClick={handleContentClick}
          />
        )}

        {trendingContent.length > 0 && (
          <ContentSection
            title="Trending Now"
            content={trendingContent}
            onContentClick={handleContentClick}
          />
        )}

        {nowPlayingMovies.length > 0 && (
          <ContentSection
            title="Now Playing"
            content={nowPlayingMovies}
            onContentClick={handleContentClick}
          />
        )}

        {airingTodayShows.length > 0 && (
          <ContentSection
            title="On The Air"
            content={airingTodayShows}
            onContentClick={handleContentClick}
          />
        )}
      </div>
    </>
  );
};
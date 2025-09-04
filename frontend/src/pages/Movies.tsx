import React, { useState, useEffect } from 'react';
import { ContentSection } from '../components/ContentSection';
import { Content, Movie } from '../types';
import { useAuth } from "../context/authContext";
import { WatchlistService } from '../services/Watchlist';

interface MoviesProps {
  onContentClick: (content: Content, creditsData?: any, detailsData?: any, recommendations?: Movie[]) => void;
}

interface MovieListsData {
  nowPlaying: any;
  topRated: any;
  upcoming: any;
  trending: any;
}

function roundToDecimal(num: number, decimalPlaces: number) {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(num * multiplier) / multiplier;
}

export const Movies: React.FC<MoviesProps> = ({ onContentClick }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const [movieListData, setMovieListData] = useState<MovieListsData>({
    nowPlaying: null,
    topRated: null,
    upcoming: null,
    trending: null
  });

  const [recommendationsContent, setRecommendationsContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [clickedContentTitle, setClickedContentTitle] = useState<string>('');

  const POSTER_URL = "https://image.tmdb.org/t/p/original";
  
  const convertToMovie = (movie: any): Movie => ({
    id: movie.id.toString(),
    title: movie.title,
    type: 'movie' as const,
    genre: [],
    rating: roundToDecimal(movie.vote_average, 1),
    year: new Date(movie.release_date).getFullYear(),
    description: movie.overview || '',
    poster: `${POSTER_URL}${movie.poster_path}`,
    backdrop: `${POSTER_URL}${movie.backdrop_path}`,
    cast: [], 
    duration: 0, 
    director: '' 
  });

  const fetchWatchlistRecommendations = async (userId: string) => {
    try {
      const movies = await WatchlistService.getMoviesWatchlist(userId);

      if (movies.length === 0) {
        console.log("No items in watchlist");
        return;
      }

      const response = await fetch("/api/watchlist-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ watchlist: movies }),
      });

      const data = await response.json();
      if (data.status === "success" && data.recommendations) {
        const recommendationDetails = await Promise.all(
          data.recommendations.map(async (id: number) => {
            try {
              let response = await fetch(`/data/movies/${id}/details`);
              let movieData = await response.json();
              return convertToMovie({ ...movieData, media_type: "movie" });
            } catch (err) {
              console.warn(`Error fetching details for ${id}:`, err);
              return null;
            }
          })
        );

        const validRecommendations = recommendationDetails.filter(Boolean) as Content[];
        setRecommendationsContent(validRecommendations);
      }
    } catch (error) {
      console.error("Error fetching watchlist recommendations:", error);
    }
  };
  
  useEffect(() => {
    Promise.all([
      fetch("/data/movies/now_playing").then(res => res.json()),
      fetch("/data/movies/top_rated").then(res => res.json()),
      fetch("/data/movies/upcoming").then(res => res.json()),
      fetch("/data/movies/trending").then(res => res.json()),
      fetchWatchlistRecommendations(userId)
    ]).then(([nowPlaying, topRated, upcoming, trending]) => {
      setMovieListData({
        nowPlaying,
        topRated,
        upcoming,
        trending
      });
      setLoading(false);
    }).catch(error => {
      console.error('Error fetching movie data:', error);
      setLoading(false);
    });
  }, []);

  const handleContentClick = async (content: Content) => {
    // Show loading screen immediately
    setContentLoading(true);
    setClickedContentTitle(content.title);
    
    window.scrollTo(0, 0);

    try {
      const recommendationsResponse = await fetch('/api/movie-clicked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movie_id: content.id })
      });
      
      const recommendationsData = await recommendationsResponse.json();

      let recommendations: Movie[] = [];

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

      const creditsUrl = `/data/movies/${content.id}/credits`;
      const detailsUrl = `/data/movies/${content.id}/details`;
      
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
  
  if (contentLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <span className="loader"></span>
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">Loading Movie Details</h2>
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Movies</h1>
            <p className="text-slate-400 text-lg">
              Discover the latest blockbusters and timeless classics <span className='text-slate-500'>(Updated Daily)</span>
            </p>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <span className="loader"></span>
              <div className="text-white text-xl">Loading movies...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nowPlayingMovies: Movie[] = movieListData.nowPlaying?.results?.map(convertToMovie) || [];
  const topRatedMovies: Movie[] = movieListData.topRated?.results?.map(convertToMovie) || [];
  const upcomingMovies: Movie[] = movieListData.upcoming?.results?.map(convertToMovie).filter((movie: Movie) => movie.year >= 2025) || [];
  const trendingMovies: Movie[] = movieListData.trending?.results?.map(convertToMovie) || [];

  return (
    <div className="min-h-screen bg-slate-950 pt-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Movies</h1>
          <p className="text-slate-400 text-lg">
            Discover the latest blockbusters and timeless classics <span className='text-slate-500'>(Updated Daily)</span>
          </p>
        </div>

        <div className="space-y-8 pb-12">
          {recommendationsContent.length > 0 && (
            <ContentSection
              title="Based On Your Movies Watchlist"
              content={recommendationsContent}
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

          {trendingMovies.length > 0 && (
            <ContentSection
              title="Trending Movies"
              content={trendingMovies}
              onContentClick={handleContentClick}
            />
          )}

          {upcomingMovies.length > 0 && (
            <ContentSection
              title="Upcoming Movies"
              content={upcomingMovies}
              onContentClick={handleContentClick}
            />
          )}

          {topRatedMovies.length > 0 && (
            <ContentSection
              title="Top Rated"
              content={topRatedMovies}
              onContentClick={handleContentClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};
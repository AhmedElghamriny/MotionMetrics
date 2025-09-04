import React, { useState, useEffect } from 'react';
import { ContentSection } from '../components/ContentSection';
import { Content, TVShow } from '../types';
import { useAuth } from "../context/authContext";
import { WatchlistService } from '../services/Watchlist';

interface TVShowsProps {
  onContentClick: (content: Content, creditsData?: any, detailsData?: any, recommendations?: TVShow[]) => void;
}

interface TVShowListsData {
  airingToday: any;
  topRated: any;
  trending: any;
}

function roundToDecimal(num: number, decimalPlaces: number) {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(num * multiplier) / multiplier;
}

export const TVShows: React.FC<TVShowsProps> = ({ onContentClick }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const [tvShowListData, setTvShowListData] = useState<TVShowListsData>({
    airingToday: null,
    topRated: null,
    trending: null
  });
  const [recommendationsContent, setRecommendationsContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [clickedContentTitle, setClickedContentTitle] = useState<string>('');

  useEffect(() => {
    Promise.all([
      fetch("/data/tv/airing_today").then(res => res.json()),
      fetch("/data/tv/top_rated").then(res => res.json()),
      fetch("/data/tv/trending").then(res => res.json()),
      fetchWatchlistRecommendations(userId)
    ]).then(([airingToday, topRated, trending]) => {
      setTvShowListData({
        airingToday,
        topRated,
        trending
      });
      console.log({ airingToday, topRated, trending });
      setLoading(false);
    }).catch(error => {
      console.error('Error fetching TV show data:', error);
      setLoading(false);
    });
  }, []);

  const POSTER_URL = "https://image.tmdb.org/t/p/original";
  
  const convertToTVShow = (show: any): TVShow => ({
    id: show.id.toString(),
    title: show.name || show.original_name,
    type: 'tv' as const,
    genre: [], 
    rating: roundToDecimal(show.vote_average, 1),
    year: new Date(show.first_air_date).getFullYear(),
    description: show.overview || '',
    poster: `${POSTER_URL}${show.poster_path}`,
    backdrop: `${POSTER_URL}${show.backdrop_path}`,
    cast: [], 
    creator: '',
    seasons: 0,
    episodes: 0,
    episodeDuration: 0,
  });

  const fetchWatchlistRecommendations = async (userId: string) => {
    try {
      const tvShows = await WatchlistService.getTVShowsWatchlist(userId);

      if (tvShows.length === 0) {
        console.log("No items in watchlist");
        return;
      }

      // Call the backend bulk API
      const response = await fetch("/api/watchlist-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ watchlist: tvShows }),
      });

      const data = await response.json();
      if (data.status === "success" && data.recommendations) {
        // Fetch details for each recommended ID
        const recommendationDetails = await Promise.all(
          data.recommendations.map(async (id: number) => {
            try {
              let response = await fetch(`/data/tv/${id}/details`);
              let movieData = await response.json();
              return convertToTVShow({ ...movieData, media_type: "tv" });
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

  const handleContentClick = async (content: Content) => {
    setContentLoading(true);
    setClickedContentTitle(content.title);
    window.scrollTo(0, 0);
    try {
      // Get recommendations from Flask backend
      const recommendationsResponse = await fetch('/api/show-clicked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ show_id: content.id })
      });
      
      const recommendationsData = await recommendationsResponse.json();
      let recommendations: TVShow[] = [];
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

      // Fetch both credits and details when content is clicked
      const creditsUrl = `/data/tv/${content.id}/credits`;
      const detailsUrl = `/data/tv/${content.id}/details`;
      
      const creditsResponse = await fetch(creditsUrl);
      const creditsData = await creditsResponse.json();
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      console.log('Credits data:', creditsData);
      console.log('Details data:', detailsData);
      
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
          <h2 className="text-white text-2xl font-semibold mb-2">Loading Show Details</h2>
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TV Shows</h1>
            <p className="text-slate-400 text-lg">
              Explore the best series and discover your next binge-watch <span className='text-slate-500'>(Updated Daily)</span>
            </p>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <span className="loader"></span>
              <div className="text-white text-xl">Loading TV shows...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const airingTodayShows: TVShow[] = tvShowListData.airingToday?.results?.map(convertToTVShow) || [];
  const topRatedShows: TVShow[] = tvShowListData.topRated?.results?.map(convertToTVShow) || [];
  const trendingShows: TVShow[] = tvShowListData.trending?.results?.map(convertToTVShow) || [];

  return (
    <div className="min-h-screen bg-slate-950 pt-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TV Shows</h1>
          <p className="text-slate-400 text-lg">
            Explore the best series and discover your next binge-watch <span className='text-slate-500'>(Updated Daily)</span>
          </p>
        </div>

        <div className="space-y-8 pb-12">
          {recommendationsContent.length > 0 && (
            <ContentSection
              title="Based On Your Shows Watchlist"
              content={recommendationsContent}
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

          {trendingShows.length > 0 && (
            <ContentSection
              title="Trending Shows"
              content={trendingShows}
              onContentClick={handleContentClick}
            />
          )}

          {topRatedShows.length > 0 && (
            <ContentSection
              title="Top Rated"
              content={topRatedShows}
              onContentClick={handleContentClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};
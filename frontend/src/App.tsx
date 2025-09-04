import React, { useState } from 'react';
import { Header, searchAPI } from './components/Header';
import { Homepage, TVShows, Movies, ContentDetails, SearchResultsPage, Login, WatchList } from './pages';
import { AuthProvider } from './context/authContext';
import { Content, SearchResults, Movie, TVShow } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  
  // Content details state
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedCredits, setSelectedCredits] = useState<any>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<(Movie | TVShow)[]>([]);
  
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'movies' | 'tv'>('all');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string, type: 'all' | 'movies' | 'tv') => {
    setIsSearchLoading(true);
    setSearchError(null);
    setSearchQuery(query);
    setSearchType(type);
    
    try {
      let results: SearchResults;
      
      switch (type) {
        case 'movies':
          results = await searchAPI.searchMovies(query);
          break;
        case 'tv':
          results = await searchAPI.searchTV(query);
          break;
        default:
          results = await searchAPI.searchAll(query);
          break;
      }
      
      setSearchResults(results);
      setCurrentPage('search-results');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'An error occurred while searching');
      console.error('Search error:', err);
      setCurrentPage('search-results');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    
    // Clear content details when navigating to different pages
    if (page !== 'content-details') {
      setSelectedContent(null);
      setSelectedCredits(null);
      setSelectedDetails(null);
      setSelectedRecommendations([]);
    }
    
    // Clear search results when navigating away from search
    if (page !== 'search-results') {
      setSearchResults(null);
      setSearchQuery('');
      setSearchError(null);
    }
  };

  const handleContentClick = (content: Content, creditsData?: any, detailsData?: any, recommendations?: (Movie | TVShow)[]) => {
    setSelectedContent(content);
    setSelectedCredits(creditsData);
    setSelectedDetails(detailsData);
    setSelectedRecommendations(recommendations || []);
    setCurrentPage('content-details');
  };

  // Handle content click from watchlist (needs to fetch fresh data)
  const handleWatchlistContentClick = async (contentId: string, contentType: 'movie' | 'tv') => {
    try {
      // Fetch content details
      const endpoint = contentType === 'movie' ? 'movies' : 'tv';
      const [detailsResponse, creditsResponse] = await Promise.all([
        fetch(`/data/${endpoint}/${contentId}/details`),
        fetch(`/data/${endpoint}/${contentId}/credits`)
      ]);

      const detailsData = await detailsResponse.json();
      const creditsData = await creditsResponse.json();

      // Create Content object from API response
      const POSTER_URL = "https://image.tmdb.org/t/p/original";
      let year = 0;
      
      if (contentType === 'movie' && detailsData.release_date) {
        try {
          year = new Date(detailsData.release_date).getFullYear();
        } catch (error) {
          console.warn('Error parsing release date:', detailsData.release_date);
        }
      } else if (contentType === 'tv' && detailsData.first_air_date) {
        try {
          year = new Date(detailsData.first_air_date).getFullYear();
        } catch (error) {
          console.warn('Error parsing first air date:', detailsData.first_air_date);
        }
      }

      const content: Content = contentType === 'movie' ? {
        id: contentId,
        title: detailsData.title || 'Unknown Title',
        type: 'movie',
        genre: detailsData.genres?.map((g: any) => g.name) || [],
        rating: Math.round((detailsData.vote_average || 0) * 10) / 10,
        year: year,
        description: detailsData.overview || 'No description available',
        poster: detailsData.poster_path ? `${POSTER_URL}${detailsData.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
        backdrop: detailsData.backdrop_path ? `${POSTER_URL}${detailsData.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
        cast: [],
        duration: detailsData.runtime || 0,
        director: ''
      } : {
        id: contentId,
        title: detailsData.name || detailsData.original_name || 'Unknown Title',
        type: 'tv',
        genre: detailsData.genres?.map((g: any) => g.name) || [],
        rating: Math.round((detailsData.vote_average || 0) * 10) / 10,
        year: year,
        description: detailsData.overview || 'No description available',
        poster: detailsData.poster_path ? `${POSTER_URL}${detailsData.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
        backdrop: detailsData.backdrop_path ? `${POSTER_URL}${detailsData.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
        cast: [],
        creator: '',
        seasons: detailsData.number_of_seasons || 0,
        episodes: detailsData.number_of_episodes || 0,
        episodeDuration: 0
      };

      // Fetch recommendations
      let recommendations: (Movie | TVShow)[] = [];
      try {
        const recommendationsEndpoint = contentType === 'movie' ? '/api/movie-clicked' : '/api/show-clicked';
        const recommendationsResponse = await fetch(recommendationsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            [contentType === 'movie' ? 'movie_id' : 'show_id']: parseInt(contentId) 
          })
        });
        
        const recommendationsData = await recommendationsResponse.json();
        
        if (recommendationsData.status === "success" && recommendationsData.recommendations) {
          const detailsPromises = recommendationsData.recommendations.map(async (id: number) => {
            try {
              const response = await fetch(`/data/${endpoint}/${id}/details`);
              return await response.json();
            } catch (error) {
              console.warn(`Error fetching recommendation ${id}:`, error);
              return null;
            }
          });
          
          const detailsResults = await Promise.all(detailsPromises);
          
          recommendations = detailsResults
            .filter(rec => rec !== null)
            .map((rec: any) => {
              let recYear = 0;
              const dateField = contentType === 'movie' ? 'release_date' : 'first_air_date';
              
              if (rec[dateField]) {
                try {
                  recYear = new Date(rec[dateField]).getFullYear();
                } catch (error) {
                  console.warn(`Error parsing ${dateField}:`, rec[dateField]);
                }
              }
              
              if (contentType === 'movie') {
                return {
                  id: rec.id.toString(),
                  title: rec.title || 'Unknown Title',
                  type: 'movie' as const,
                  genre: [],
                  rating: Math.round((rec.vote_average || 0) * 10) / 10,
                  year: recYear,
                  description: rec.overview || 'No description available',
                  poster: rec.poster_path ? `${POSTER_URL}${rec.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
                  backdrop: rec.backdrop_path ? `${POSTER_URL}${rec.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
                  cast: [],
                  duration: 0,
                  director: ''
                } as Movie;
              } else {
                return {
                  id: rec.id.toString(),
                  title: rec.name || rec.original_name || 'Unknown Title',
                  type: 'tv' as const,
                  genre: [],
                  rating: Math.round((rec.vote_average || 0) * 10) / 10,
                  year: recYear,
                  description: rec.overview || 'No description available',
                  poster: rec.poster_path ? `${POSTER_URL}${rec.poster_path}` : 'https://via.placeholder.com/500x750/1e293b/94a3b8?text=No+Image',
                  backdrop: rec.backdrop_path ? `${POSTER_URL}${rec.backdrop_path}` : 'https://via.placeholder.com/1920x1080/1e293b/94a3b8?text=No+Image',
                  cast: [],
                  creator: '',
                  seasons: 0,
                  episodes: 0,
                  episodeDuration: 0
                } as TVShow;
              }
            });
        }
      } catch (error) {
        console.warn('Error fetching recommendations:', error);
      }

      handleContentClick(content, creditsData, detailsData, recommendations);
    } catch (error) {
      console.error('Error loading content from watchlist:', error);
      alert('Failed to load content details. Please try again.');
    }
  };

  const handleBackFromDetails = () => {
    setSelectedContent(null);
    setSelectedCredits(null);
    setSelectedDetails(null);
    setSelectedRecommendations([]);
    setCurrentPage('home');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setSearchResults(null);
    setSearchQuery('');
    setSearchError(null);
  };

  // Page routing logic
  const getCurrentPageComponent = () => {
    const pageProps = {
      onContentClick: handleContentClick,
      onPageChange: handlePageChange,
    };

    switch (currentPage) {
      case 'login':
        return <Login {...pageProps} />;
        
      case 'home':
        return <Homepage {...pageProps} />;
        
      case 'movies':
        return <Movies {...pageProps} />;
        
      case 'tv-shows':
        return <TVShows {...pageProps} />;

      case 'watchlist':
        return <WatchList onContentClick={handleWatchlistContentClick} />;
        
      case 'search-results':
        return (
          <SearchResultsPage
            results={searchResults}
            searchQuery={searchQuery}
            searchType={searchType}
            isLoading={isSearchLoading}
            error={searchError}
            onItemClick={handleContentClick}
            onBackToHome={handleBackToHome}
          />
        );
        
      case 'content-details':
        return (
          <ContentDetails
            content={selectedContent}
            creditsData={selectedCredits}
            detailsData={selectedDetails}
            recommendations={selectedRecommendations}
            onBack={handleBackFromDetails}
            onContentClick={handleContentClick}
          />
        );
        
      default:
        return <Homepage {...pageProps} />;
    }
  };

  const shouldShowHeader = currentPage !== 'content-details' && currentPage !== 'login';

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950">
        {shouldShowHeader && (
          <Header 
            onSearch={handleSearch} 
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        )}
        
        {getCurrentPageComponent()}
      </div>
    </AuthProvider>
  );
}

export default App;
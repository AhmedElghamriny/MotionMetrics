interface BaseContent {
  id: string;
  title: string;
  genre: string[];
  rating: number;
  year: number;
  description: string;
  poster: string;
  backdrop: string;
  cast: string[];
}

interface Actor {
  id: string;
  real_name: string;
  chracter_name: string;
  poster: string;
}

interface Crew {
  id: string;
  real_name: string;
  poster: string;
}

export interface Movie extends BaseContent {
  type: 'movie';
  duration: number;
  director: string;
}

export interface TVShow extends BaseContent {
  type: 'tv';
  creator: string;
  seasons: number;
  episodes: number;
  episodeDuration: number;
}

export type Content = Movie | TVShow;

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    genres: string[];
    minRating: number;
  };
  watchHistory: {
    contentId: string;
    watchedAt: Date;
    rating?: number;
  }[];
  watchlist: string[]; // content IDs
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string; 
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; 
  first_air_date?: string; 
  vote_average: number;
  vote_count: number;
  media_type?: 'movie' | 'tv' | 'person';
  genre_ids: number[];
}

export interface SearchResults {
  page: number;
  results: MediaItem[];
  total_pages: number;
  total_results: number;
}
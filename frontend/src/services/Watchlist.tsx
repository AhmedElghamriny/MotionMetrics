import { doc, setDoc, deleteDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Content } from '../types';

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'tv';
  poster: string;
  rating: number;
  year: number;
  description: string;
  addedAt: Date;
}

export class WatchlistService {
  /**
   * Add a movie or TV show to user's watchlist
   */
  static async addToWatchlist(userId: string, content: Content): Promise<void> {
    try {
      // Simplified structure: users/{userId}/watchlist/{contentId}
      // Include type in the document data instead of separate collections
      const docRef = doc(db, 'users', userId, 'watchlist', content.id);
      
      const watchlistItem: WatchlistItem = {
        id: content.id,
        title: content.title,
        type: content.type,
        poster: content.poster,
        rating: content.rating,
        year: content.year,
        description: content.description,
        addedAt: new Date()
      };

      await setDoc(docRef, watchlistItem);
      console.log(`Added ${content.type} "${content.title}" to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw new Error('Failed to add to watchlist');
    }
  }

  /**
   * Remove a movie or TV show from user's watchlist
   */
  static async removeFromWatchlist(userId: string, contentId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'watchlist', contentId);
      await deleteDoc(docRef);
      console.log(`Removed content with ID ${contentId} from watchlist`);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw new Error('Failed to remove from watchlist');
    }
  }

  /**
   * Check if an item is in the user's watchlist
   */
  static async isInWatchlist(userId: string, contentId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'users', userId, 'watchlist', contentId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  }

  /**
   * Get all items from user's watchlist
   */
  static async getAllWatchlistItems(userId: string): Promise<{movies: WatchlistItem[], tvShows: WatchlistItem[]}> {
    try {
      const watchlistRef = collection(db, 'users', userId, 'watchlist');
      const q = query(watchlistRef, orderBy('addedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const allItems: WatchlistItem[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          // Convert Firestore timestamp to Date
          addedAt: data.addedAt?.toDate ? data.addedAt.toDate() : new Date(data.addedAt)
        } as WatchlistItem;
      });

      // Separate movies and TV shows
      const movies = allItems.filter(item => item.type === 'movie');
      const tvShows = allItems.filter(item => item.type === 'tv');

      return { movies, tvShows };
    } catch (error) {
      console.error('Error getting watchlist items:', error);
      return { movies: [], tvShows: [] };
    }
  }

  /**
   * Get only movies from user's watchlist
   */
  static async getMoviesWatchlist(userId: string): Promise<WatchlistItem[]> {
    const { movies } = await this.getAllWatchlistItems(userId);
    return movies;
  }

  /**
   * Get only TV shows from user's watchlist
   */
  static async getTVShowsWatchlist(userId: string): Promise<WatchlistItem[]> {
    const { tvShows } = await this.getAllWatchlistItems(userId);
    return tvShows;
  }

  /**
   * Get total count of items in watchlist
   */
  static async getWatchlistCount(userId: string): Promise<{movies: number, tvShows: number, total: number}> {
    try {
      const { movies, tvShows } = await this.getAllWatchlistItems(userId);
      return {
        movies: movies.length,
        tvShows: tvShows.length,
        total: movies.length + tvShows.length
      };
    } catch (error) {
      console.error('Error getting watchlist count:', error);
      return { movies: 0, tvShows: 0, total: 0 };
    }
  }

  /**
   * Batch add multiple items to watchlist
   */
  static async batchAddToWatchlist(userId: string, contents: Content[]): Promise<void> {
    try {
      const promises = contents.map(content => this.addToWatchlist(userId, content));
      await Promise.all(promises);
      console.log(`Added ${contents.length} items to watchlist`);
    } catch (error) {
      console.error('Error batch adding to watchlist:', error);
      throw new Error('Failed to batch add to watchlist');
    }
  }

  /**
   * Clear all items from watchlist
   */
  static async clearWatchlist(userId: string): Promise<void> {
    try {
      const { movies, tvShows } = await this.getAllWatchlistItems(userId);
      const allItems = [...movies, ...tvShows];
      
      const promises = allItems.map(item => this.removeFromWatchlist(userId, item.id));
      await Promise.all(promises);
      
      console.log('Cleared all watchlist items');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      throw new Error('Failed to clear watchlist');
    }
  }
}
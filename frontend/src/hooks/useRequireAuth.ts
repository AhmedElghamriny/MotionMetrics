import { useEffect } from 'react';
import { useAuth } from '../context/authContext';

export const useRequireAuth = (redirectTo: string = '/') => {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !currentUser) {
      // Redirect to login or show login modal
      console.log('User not authenticated, redirect to:', redirectTo);
    }
  }, [currentUser, loading, redirectTo]);

  return { currentUser, loading };
};
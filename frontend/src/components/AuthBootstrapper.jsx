'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMe } from '@/store/slices/authSlice';

/**
 * Lightweight client-only component that rehydrates auth state from the httpOnly cookie.
 * This keeps the user logged in across page refreshes without changing the auth flow.
 */
export default function AuthBootstrapper() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMe()).catch(() => {
      // Silently ignore – unauthenticated is a valid state
    });
  }, [dispatch]);

  return null;
}


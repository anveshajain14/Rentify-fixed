'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hydrateCart } from '@/store/slices/cartSlice';

const STORAGE_PREFIX = 'luxerent-cart:';

function getKeyForUser(user) {
  if (!user || !user.id) return `${STORAGE_PREFIX}guest`;
  return `${STORAGE_PREFIX}${user.id}`;
}

export default function CartPersistence() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const items = useSelector((state) => state.cart.items);
  const lastKeyRef = useRef(null);

  // Hydrate cart for current identity on first mount / when user changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getKeyForUser(user);
    lastKeyRef.current = key;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      dispatch(hydrateCart(Array.isArray(parsed) ? parsed : []));
    } catch {
      dispatch(hydrateCart([]));
    }
  }, [user?.id, dispatch]);

  // Persist cart whenever items change, scoped to the active identity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = lastKeyRef.current || getKeyForUser(user);
    try {
      window.localStorage.setItem(key, JSON.stringify(items || []));
    } catch {
      // Best-effort only; ignore quota or serialization errors
    }
  }, [items, user]);

  return null;
}


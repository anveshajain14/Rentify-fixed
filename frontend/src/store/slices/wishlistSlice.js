import { createSlice } from '@reduxjs/toolkit';

const WISHLIST_KEY = 'luxerent_wishlist';

function loadWishlist() {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(WISHLIST_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishlist(ids) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {}
}

const initialState = { productIds: loadWishlist() };

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const id = action.payload;
      if (!state.productIds.includes(id)) {
        state.productIds.push(id);
        saveWishlist(state.productIds);
      }
    },
    removeFromWishlist: (state, action) => {
      state.productIds = state.productIds.filter((id) => id !== action.payload);
      saveWishlist(state.productIds);
    },
    toggleWishlist: (state, action) => {
      const id = action.payload;
      const idx = state.productIds.indexOf(id);
      if (idx >= 0) {
        state.productIds = state.productIds.filter((i) => i !== id);
      } else {
        state.productIds.push(id);
      }
      saveWishlist(state.productIds);
    },
  },
});

export const { addToWishlist, removeFromWishlist, toggleWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

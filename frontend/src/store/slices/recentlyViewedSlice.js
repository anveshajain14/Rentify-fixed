import { createSlice } from '@reduxjs/toolkit';

const MAX_RECENT = 20;
const RECENT_KEY = 'luxerent_recently_viewed';

function load() {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(RECENT_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function save(ids) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
  } catch {}
}

const initialState = { productIds: load() };

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState,
  reducers: {
    addViewed: (state, action) => {
      const id = action.payload;
      state.productIds = [id, ...state.productIds.filter((i) => i !== id)].slice(0, MAX_RECENT);
      save(state.productIds);
    },
    clearViewed: (state) => {
      state.productIds = [];
      save(state.productIds);
    },
  },
});

export const { addViewed, clearViewed } = recentlyViewedSlice.actions;
export default recentlyViewedSlice.reducer;

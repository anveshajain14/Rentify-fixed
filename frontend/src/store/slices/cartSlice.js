import { createSlice } from '@reduxjs/toolkit';

// Cart state is kept in-memory per session and user.
// It is cleared explicitly on logout to avoid sharing between accounts.
const initialState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { productId, product, startDate, endDate, duration } = action.payload;
      const exists = state.items.findIndex((i) => i.productId === productId);
      if (exists >= 0) {
        state.items[exists] = { productId, product, startDate, endDate, duration };
      } else {
        state.items.push({ productId, product, startDate, endDate, duration });
      }
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    updateCartItemDates: (state, action) => {
      const idx = state.items.findIndex((i) => i.productId === action.payload.productId);
      if (idx >= 0) {
        state.items[idx].startDate = action.payload.startDate;
        state.items[idx].endDate = action.payload.endDate;
        state.items[idx].duration = action.payload.duration;
      }
    },
    clearCart: (state) => {
      state.items = [];
    },
    // Hydrate cart from a persisted source (e.g. per-user localStorage bucket)
    hydrateCart: (state, action) => {
      const nextItems = Array.isArray(action.payload) ? action.payload : [];
      state.items = nextItems;
    },
  },
});

export const { addToCart, removeFromCart, updateCartItemDates, clearCart, hydrateCart } = cartSlice.actions;
export default cartSlice.reducer;

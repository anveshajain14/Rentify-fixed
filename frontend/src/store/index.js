import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import filtersReducer from './slices/filtersSlice';
import recentlyViewedReducer from './slices/recentlyViewedSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    filters: filtersReducer,
    recentlyViewed: recentlyViewedReducer,
  },
});

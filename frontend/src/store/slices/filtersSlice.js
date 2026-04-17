import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  category: 'All',
  priceMin: '',
  priceMax: '',
  duration: '',
  availabilityStart: '',
  availabilityEnd: '',
  ratingMin: '',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setCategory: (state, action) => {
      state.category = action.payload;
    },
    setPriceRange: (state, action) => {
      if (action.payload.min !== undefined) state.priceMin = action.payload.min;
      if (action.payload.max !== undefined) state.priceMax = action.payload.max;
    },
    setDuration: (state, action) => {
      state.duration = action.payload;
    },
    setAvailability: (state, action) => {
      if (action.payload.start !== undefined) state.availabilityStart = action.payload.start;
      if (action.payload.end !== undefined) state.availabilityEnd = action.payload.end;
    },
    setRatingMin: (state, action) => {
      state.ratingMin = action.payload;
    },
    resetFilters: () => initialState,
  },
});

export const { setCategory, setPriceRange, setDuration, setAvailability, setRatingMin, resetFilters } = filtersSlice.actions;
export default filtersSlice.reducer;

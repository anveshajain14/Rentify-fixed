'use client';

import { useDispatch, useSelector } from 'react-redux';
import {
  setCategory,
  setPriceRange,
  setDuration,
  setAvailability,
  setRatingMin,
  resetFilters,
} from '@/store/slices/filtersSlice';
import { motion } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Photography', 'Outdoor'];
const DURATIONS = [
  { value: '', label: 'Any' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];
const RATINGS = [ '', 4, 3, 2 ];

export default function ProductFilters({ onClose, isMobile }) {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.filters);

  const content = (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-lg text-foreground">Filters</h3>
        {isMobile && onClose && (
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary" aria-label="Close filters">
            <X size={20} />
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => dispatch(setCategory(cat))}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filters.category === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Price per day ($)</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin === '' ? '' : filters.priceMin}
            onChange={(e) => dispatch(setPriceRange({ min: e.target.value === '' ? '' : Number(e.target.value) }))}
            className="w-full bg-input border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax === '' ? '' : filters.priceMax}
            onChange={(e) => dispatch(setPriceRange({ max: e.target.value === '' ? '' : Number(e.target.value) }))}
            className="w-full bg-input border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Rental duration</label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value || 'any'}
              onClick={() => dispatch(setDuration(d.value))}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filters.duration === d.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Availability</label>
        <div className="space-y-2">
          <input
            type="date"
            value={filters.availabilityStart}
            onChange={(e) => dispatch(setAvailability({ start: e.target.value }))}
            className="w-full bg-input border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none"
          />
          <input
            type="date"
            value={filters.availabilityEnd}
            onChange={(e) => dispatch(setAvailability({ end: e.target.value }))}
            className="w-full bg-input border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Min. rating</label>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button
              key={r === '' ? 'any' : r}
              onClick={() => dispatch(setRatingMin(r === '' ? '' : r))}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filters.ratingMin === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {r === '' ? 'Any' : `${r}+ stars`}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => dispatch(resetFilters())}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border font-bold text-muted-foreground hover:bg-secondary"
      >
        <RotateCcw size={16} /> Reset filters
      </button>
    </div>
  );

  if (isMobile) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <aside className="bg-card rounded-3xl border border-border p-6 shadow-sm dark:shadow-black/20 h-fit sticky top-28">
      {content}
    </aside>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useDispatch, useSelector } from 'react-redux';
import { setCategory } from '@/store/slices/filtersSlice';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import { Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';

function applyFilters(products, filters, search) {
  let list = [...products];
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((p) => p.title.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
  }
  if (filters.category && filters.category !== 'All') {
    list = list.filter((p) => p.category === filters.category);
  }
  if (filters.priceMin !== '' && typeof filters.priceMin === 'number') {
    list = list.filter((p) => (p.pricePerDay ?? 0) >= filters.priceMin);
  }
  if (filters.priceMax !== '' && typeof filters.priceMax === 'number') {
    list = list.filter((p) => (p.pricePerDay ?? 0) <= filters.priceMax);
  }
  if (filters.duration) {
    if (filters.duration === 'week') list = list.filter((p) => p.pricePerWeek != null);
    if (filters.duration === 'month') list = list.filter((p) => p.pricePerMonth != null);
  }
  if (filters.availabilityStart && filters.availabilityEnd) {
    const start = new Date(filters.availabilityStart).getTime();
    const end = new Date(filters.availabilityEnd).getTime();
    list = list.filter((p) => {
      const blocks = p.availability || [];
      if (blocks.length === 0) return true;
      const overlaps = blocks.some((b) => {
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        return !(end < bStart || start > bEnd);
      });
      return !overlaps;
    });
  }
  return list;
}

const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Photography', 'Outdoor'];

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const filters = useSelector((state) => state.filters);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && CATEGORIES.includes(cat)) dispatch(setCategory(cat));
  }, [searchParams, dispatch]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/products?approved=true');
        setProducts(res.data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => applyFilters(products, filters, search), [products, filters, search]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Explore Rentals</h1>
          <p className="text-muted-foreground mb-6">Find premium gear and furniture from our verified community.</p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground shadow-sm"
              />
            </div>
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="lg:hidden flex items-center justify-center gap-2 px-6 py-3.5 bg-card border border-border rounded-2xl font-bold text-foreground hover:bg-secondary"
            >
              <Filter size={20} /> Filters
            </button>
          </div>
        </header>

        <div className="flex gap-8">
          {/* Desktop filter panel */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <ProductFilters />
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-[420px] bg-muted animate-pulse rounded-3xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center bg-card rounded-3xl border border-dashed border-border">
                    <Filter className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-xl font-bold text-foreground mb-2">No products yet</h3>
                    <p className="text-muted-foreground mb-6">Be the first to list your premium items for rent.</p>
                    <Link href="/register?role=seller" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90">
                      Become a Seller
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {filterDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-background dark:bg-card z-50 shadow-2xl overflow-y-auto lg:hidden border-l border-border"
            >
              <ProductFilters isMobile onClose={() => setFilterDrawerOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading products...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}

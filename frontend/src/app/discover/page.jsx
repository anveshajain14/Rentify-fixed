'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Zap, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['Electronics', 'Furniture', 'Photography', 'Outdoor'];

export default function DiscoverPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
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

  const filteredBySearch = search.trim()
    ? products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : products;
  const featured = products.slice(0, 8);
  const recentlyAdded = [...products].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  ).slice(0, 8);
  const byCategory = (cat) =>
    cat === 'All' ? products : products.filter((p) => p.category === cat);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Discover Rentals</h1>
          <p className="text-muted-foreground mb-8">Find what you need. Search and browse by category.</p>

          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground shadow-sm"
            />
          </div>
        </header>

        {search.trim() ? (
          <section className="mb-16">
            <h2 className="text-xl font-black mb-6 text-foreground">Search results</h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[420px] bg-muted rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : filteredBySearch.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredBySearch.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center rounded-3xl bg-card border border-dashed border-border">
                <p className="text-muted-foreground font-medium">No products match your search.</p>
                <button onClick={() => setSearch('')} className="mt-4 text-emerald-600 dark:text-cyan-400 font-bold">Clear search</button>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mb-16">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-black flex items-center gap-2 text-foreground"><Sparkles size={22} className="text-amber-500" /> Featured</h2>
                <Link href="/products" className="text-sm font-bold text-emerald-600 dark:text-cyan-400 hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-[420px] bg-gray-200 rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featured.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              )}
            </section>

            <section className="mb-16">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-black flex items-center gap-2 text-foreground"><Clock size={22} className="text-blue-500" /> Recently Added</h2>
                <Link href="/products" className="text-sm font-bold text-emerald-600 dark:text-cyan-400 hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
              </div>
              {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentlyAdded.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              )}
            </section>

            {CATEGORIES.map((cat) => {
              const list = byCategory(cat);
              if (list.length === 0) return null;
              return (
                <section key={cat} className="mb-16">
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-black text-foreground">{cat}</h2>
                    <Link href={`/products?category=${cat}`} className="text-sm font-bold text-emerald-600 dark:text-cyan-400 hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {list.slice(0, 4).map((p) => (
                      <ProductCard key={p._id} product={p} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}

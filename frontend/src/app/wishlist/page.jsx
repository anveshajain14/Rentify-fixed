'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useSelector } from 'react-redux';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { motion } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function WishlistPage() {
  const productIds = useSelector((state) => state.wishlist.productIds);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products?approved=true');
        const all = res.data.products || [];
        setProducts(all.filter((p) => productIds.includes(p._id)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [productIds.join(',')]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <h1 className="text-3xl font-black tracking-tighter text-foreground mb-8 flex items-center gap-2">
          <Heart size={28} className="text-red-500 fill-red-500" /> Wishlist ({productIds.length})
        </h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[420px] bg-muted rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </motion.div>
        ) : (
          <div className="py-24 text-center bg-card rounded-3xl border border-dashed border-border">
            <Heart className="mx-auto text-muted-foreground mb-4" size={56} />
            <p className="text-muted-foreground font-medium mb-4">Your wishlist is empty</p>
            <Link href="/products" className="inline-block px-8 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500">
              Browse rentals
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

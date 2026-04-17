'use client';

import { useSelector } from 'react-redux';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, CreditCard } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-32 pb-20 text-center">
          <p className="text-muted-foreground">Please log in to view your profile.</p>
          <Link href="/login" className="inline-block mt-4 text-emerald-600 dark:text-cyan-400 font-bold">Go to Login</Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <h1 className="text-3xl font-black tracking-tighter text-foreground mb-8">Profile & Payments</h1>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border p-8 shadow-sm dark:shadow-black/20 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-2xl">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">{user.name}</h2>
              <p className="text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail size={20} />
              <span>{user.email}</span>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><CreditCard size={18} /> Payment methods</h3>
            <p className="text-muted-foreground text-sm">Saved payment methods are managed at checkout. We use Stripe for secure payments.</p>
          </div>
          <div className="pt-4 flex flex-wrap gap-3">
            <Link href="/dashboard" className="px-6 py-3 bg-secondary text-secondary-foreground rounded-2xl font-bold hover:bg-accent">
              My Rentals
            </Link>
            <Link href="/cart" className="px-6 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500">
              Cart
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}

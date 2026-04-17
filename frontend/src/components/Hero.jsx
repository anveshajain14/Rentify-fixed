'use client';

import { motion } from 'framer-motion';
import { Search, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50/60 via-transparent to-cyan-50/40 dark:from-emerald-950/20 dark:via-transparent dark:to-cyan-950/10" />
      <div className="absolute top-1/4 left-1/4 -z-10 w-64 h-64 bg-emerald-400/10 dark:bg-emerald-500/5 blur-3xl rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/5 blur-3xl rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-bold mb-6">
              <Zap size={14} />
              Premium Rentals
            </div>

            <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] tracking-tighter text-foreground mb-6">
              Experience the <span className="text-emerald-600 dark:text-cyan-400 italic">Premium</span> Lifestyle.
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Access high-end electronics, designer furniture, and professional gear without the commitment of ownership.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl group"
              >
                Browse Rentals
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/register?role=seller"
                className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-8 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold border border-border hover:bg-accent transition-all"
              >
                <Shield size={18} /> Become a Seller
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-500 dark:text-cyan-400" />
                <span>Verified sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-emerald-500 dark:text-cyan-400" />
                <span>Secure payments</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative hidden lg:block"
          >
            <div className="relative z-10 rounded-[32px] overflow-hidden shadow-2xl dark:shadow-black/40 border border-border">
              <div className="aspect-[4/5] bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-emerald-200/50 dark:bg-emerald-800/30 flex items-center justify-center">
                    <Sparkles size={40} className="text-emerald-600 dark:text-cyan-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">Premium marketplace</p>
                  <p className="text-foreground font-bold text-lg mt-1">Start exploring</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

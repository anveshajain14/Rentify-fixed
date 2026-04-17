'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RentalCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-card p-10 rounded-2xl shadow-2xl dark:shadow-black/40 border border-border max-w-md w-full mx-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full mb-6"
        >
          <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
        </motion.div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-6">
          Your payment was cancelled. No charges have been made. Feel free to try again when you&apos;re ready.
        </p>
        <div className="space-y-3">
          <Link
            href="/products"
            className="inline-block w-full py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-colors"
          >
            Browse Products
          </Link>
          <Link
            href="/"
            className="inline-block w-full py-3 px-6 bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-accent transition-colors"
          >
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

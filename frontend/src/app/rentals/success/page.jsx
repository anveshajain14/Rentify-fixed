'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isCod = searchParams.get('cod') === '1';

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
          className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6"
        >
          <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-cyan-400" />
        </motion.div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {isCod ? 'Order confirmed!' : 'Payment successful!'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isCod
            ? 'Your order has been placed. Pay when you receive the item.'
            : 'Your rental has been confirmed. You will receive a confirmation email shortly.'}
        </p>
        {sessionId && !isCod && (
          <p className="text-sm text-muted-foreground mb-6 break-all">
            Session: {sessionId}
          </p>
        )}
        <Link
          href="/dashboard"
          className="inline-block w-full py-3 px-6 bg-emerald-600 dark:bg-cyan-600 text-white font-semibold rounded-xl hover:bg-emerald-700 dark:hover:bg-cyan-700 transition-colors"
        >
          View My Rentals
        </Link>
      </motion.div>
    </div>
  );
}

export default function RentalSuccessPage() {
  return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

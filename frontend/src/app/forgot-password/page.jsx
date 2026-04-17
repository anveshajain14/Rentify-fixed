'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
      toast.success('If this email exists, a reset link has been sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen pt-24 px-4 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-card rounded-[40px] shadow-2xl dark:shadow-black/40 p-10 border border-border text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <Mail className="text-emerald-600" size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground mb-6">
              If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-emerald-600 dark:text-cyan-400 font-bold hover:underline"
            >
              Back to Sign In <ArrowRight size={18} />
            </Link>
            <p className="mt-8 text-sm text-muted-foreground">
              Didn&apos;t receive the email?{' '}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-emerald-600 font-medium hover:underline"
              >
                Try again
              </button>
            </p>
          </motion.div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen pt-24 px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card rounded-[40px] shadow-xl dark:shadow-black/40 p-10 border border-border"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2">Forgot password?</h1>
            <p className="text-muted-foreground">Enter your email and we&apos;ll send you a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl focus:ring-2 focus:ring-ring transition-all outline-none text-foreground placeholder:text-muted-foreground"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Send reset link <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="text-emerald-600 dark:text-cyan-400 font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}

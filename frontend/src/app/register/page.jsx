'use client';

import { useState, useEffect } from 'react';
import api, { apiBaseUrl } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const ERROR_MESSAGES = {
  google_cancelled: 'You cancelled the Google sign-in.',
  google_failed: 'Google sign-in failed. Please try again.',
  invalid_callback: 'Invalid callback. Please try again.',
  invalid_state: 'Security check failed. Please try again.',
  oauth_not_configured: 'Google sign-in is not configured.',
  token_exchange_failed: 'Could not complete sign-in. Please try again.',
  userinfo_failed: 'Could not fetch your profile. Please try again.',
  no_email: 'Google did not provide an email.',
  account_blocked: 'This account has been blocked.',
  server_error: 'Something went wrong. Please try again.',
};
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast.error(ERROR_MESSAGES[error] || 'Sign-in failed. Please try again.');
      router.replace('/register', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'seller') setRole('seller');
    if (r === 'user') setRole('user');
  }, [searchParams]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', { name, email, password, role });
      toast.success(res.data.message || 'Check your email to verify your account');
      router.push(`/verify-email?email=${encodeURIComponent(res.data.email || email)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join the premium rental community today</p>
          </div>

          <div className="flex p-1 bg-muted rounded-2xl mb-8">
            <button
              onClick={() => setRole('user')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${role === 'user' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              User
            </button>
            <button
              onClick={() => setRole('seller')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${role === 'seller' ? 'bg-card text-emerald-600 dark:text-cyan-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Seller
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent transition-all outline-none text-foreground placeholder:text-muted-foreground"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent transition-all outline-none text-foreground placeholder:text-muted-foreground"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent transition-all outline-none text-foreground placeholder:text-muted-foreground"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">or</span>
              </div>
            </div>

            <a
              href={`${apiBaseUrl}/api/auth/google`}
              className="w-full py-3.5 px-4 rounded-2xl border border-border bg-card hover:bg-muted flex items-center justify-center gap-3 font-bold text-foreground transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
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

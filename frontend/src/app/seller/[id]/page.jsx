'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Star, MapPin, Calendar, CheckCircle, Loader2, Package, FileText, Share2, Copy, Flag } from 'lucide-react';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1600';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop';
const DEFAULT_RENTER_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

function SkeletonCard() {
  return (
    <div className="bg-card rounded-3xl overflow-hidden border border-border">
      <div className="aspect-[4/5] bg-muted animate-pulse" />
      <div className="p-6 space-y-2">
        <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-muted/70 rounded w-1/2 animate-pulse" />
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse mt-4" />
      </div>
    </div>
  );
}

export default function SellerShopPage() {
  const params = useParams();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const authUser = useSelector((state) => state.auth.user);
  const [eligibleOrderId, setEligibleOrderId] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);

  const fetchSeller = useCallback(async (page = 1) => {
    try {
      if (page === 1) setLoading(true);
      else setReviewsLoading(true);
      const res = await api.get(`/api/seller/${id}`, {
        params: page > 1 ? { reviewPage: page, reviewLimit: 10 } : undefined,
      });
          setData((prev) => {
            const next = res.data;
            if (page === 1) return next;
            if (!prev) return next;
            return {
              ...prev,
              reviews: [...prev.reviews, ...(next.reviews || [])],
              reviewPage: next.reviewPage,
            };
          });
    } catch {
      if (page === 1) setData(null);
    } finally {
      setLoading(false);
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeller(1);
  }, [fetchSeller]);

  useEffect(() => {
    if (!authUser || !id) {
      setEligibleOrderId(null);
      return;
    }
    api
      .get('/api/order-request')
      .then((res) => {
        const orders = res.data?.orders || [];
        const match = orders.find(
          (o) => o && o.status === 'completed' && String(o.sellerId) === String(id) && String(o.renterId) === String(authUser?._id || authUser?.id)
        );
        setEligibleOrderId(match?._id || null);
      })
      .catch(() => setEligibleOrderId(null));
  }, [authUser, id]);

  const loadMoreReviews = () => {
    const next = (data?.reviewPage ?? 1) + 1;
    fetchSeller(next);
  };

  const hasMoreReviews = data && data.totalReviews > data.reviews.length;

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="relative h-[400px] bg-muted animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-20">
          <div className="bg-card rounded-[40px] p-8 shadow-2xl border border-border animate-pulse h-64 mb-12" />
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="space-y-8">
              <div className="h-24 bg-muted rounded-2xl animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="grid sm:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Navbar />
        <div className="text-center px-4">
          <h1 className="text-2xl font-black text-foreground mb-2">Seller not found</h1>
          <p className="text-muted-foreground">This shop may be private or the link may be incorrect.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const { seller, products, reviews, stats, ratingDistribution, topPicks } = data;
  const bannerSrc = seller.shopBanner || DEFAULT_BANNER;
  const avatarSrc = seller.avatar || DEFAULT_AVATAR;

  const credibilityBadges = [];
  if (stats.totalRentalsCompleted >= 25) {
    credibilityBadges.push({ label: 'Top Seller', icon: '🏆' });
  }
  if (stats.responseRate >= 95) {
    credibilityBadges.push({ label: 'Fast Responder', icon: '⚡' });
  }
  if (stats.averageRating >= 4.7 && stats.totalReviews >= 10) {
    credibilityBadges.push({ label: 'Highly Rated', icon: '🌟' });
  }

  const handleShareShop = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${seller.name} on LuxeRent`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        // eslint-disable-next-line no-alert
        alert('Seller profile link copied to clipboard.');
      }
    } catch {
      // eslint-disable-next-line no-alert
      alert('Unable to share right now.');
    }
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      // eslint-disable-next-line no-alert
      alert('Seller profile link copied to clipboard.');
    } catch {
      // eslint-disable-next-line no-alert
      alert('Unable to copy link.');
    }
  };

  const handleReportSeller = async () => {
    if (!authUser) {
      toast.error('Please login to report a seller.');
      return;
    }
    if (!window.confirm('Report this seller to the admin team?')) return;
    const reason = window.prompt('Please describe the issue:');
    if (!reason) return;
    try {
      await api.post('/api/report', {
        reportedUserId: seller._id,
        reason,
      });
      toast.success('Report submitted to admins.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    }
  };

  const submitSellerReview = async () => {
    if (!authUser) return toast.error('Please login to review');
    if (!eligibleOrderId) return toast.error('You can review only after order completion');
    setReviewSubmitting(true);
    try {
      await api.post('/api/reviews', {
        orderId: eligibleOrderId,
        targetType: 'seller',
        targetId: id,
        rating: reviewRating,
        review: reviewText,
      });
      toast.success('Review submitted');
      setReviewModalOpen(false);
      setReviewText('');
      setReviewRating(5);
      fetchSeller(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero / Parallax Banner */}
      <div className="relative h-[420px] overflow-hidden">
        <motion.div style={{ y: y1 }} className="absolute inset-0">
          <Image src={bannerSrc} alt="" fill className="object-cover" sizes="100vw" unoptimized={bannerSrc.startsWith('http')} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Seller header card */}
        <div className="relative -mt-28 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card/95 backdrop-blur rounded-[40px] p-8 md:p-12 shadow-2xl dark:shadow-black/40 border border-border flex flex-col md:flex-row items-center gap-8"
          >
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[32px] overflow-hidden border-4 border-white shadow-xl flex-shrink-0">
              <Image src={avatarSrc} alt={seller.name} fill className="object-cover" sizes="160px" unoptimized={avatarSrc.startsWith('http')} />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">{seller.name}</h1>
                {seller.isApproved && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    <CheckCircle size={14} /> Verified Seller
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 text-muted-foreground font-medium text-sm">
                {seller.location && (
                  <span className="flex items-center gap-1"><MapPin size={16} /> {seller.location}</span>
                )}
                <span className="flex items-center gap-1"><Calendar size={16} /> Joined {new Date(seller.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <span className="flex items-center gap-1"><Star size={16} className="text-amber-500" fill="currentColor" /> <AnimatedCounter value={stats.averageRating} decimalPlaces={1} /> ({stats.totalRentalsCompleted} rentals)</span>
              </div>
              {credibilityBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
                  {credibilityBadges.map((b) => (
                    <span
                      key={b.label}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <span>{b.icon}</span>
                      <span>{b.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:justify-end md:ml-auto">
              <button
                type="button"
                onClick={handleShareShop}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-colors"
              >
                <Share2 size={16} /> Share Seller Shop
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-secondary text-secondary-foreground text-sm font-bold hover:bg-accent transition-colors"
              >
                <Copy size={16} /> Copy Profile Link
              </button>
              <button
                type="button"
                onClick={handleReportSeller}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
              >
                <Flag size={16} /> Report Seller
              </button>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 pb-20">
          {/* Sidebar: About, Policies, Stats, Rating distribution */}
          <div className="lg:col-span-1 space-y-10">
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" /> About
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {seller.bio || "This seller hasn't added a bio yet. They're a verified partner on LuxeRent."}
              </p>
            </motion.section>

            {seller.policies && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" /> Policies
                </h3>
                <div className="p-6 bg-muted/50 rounded-2xl border border-border">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{seller.policies}</pre>
                </div>
              </motion.section>
            )}

            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" /> Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Reliability score', value: stats.reliabilityScore ?? 0, suffix: '%', color: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Avg. rating', value: stats.averageRating, suffix: '/5', color: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Rentals done', value: stats.totalRentalsCompleted, suffix: '', color: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Active listings', value: stats.activeListings, suffix: '', color: 'bg-slate-50 dark:bg-slate-900/20' },
                  { label: 'Response rate', value: stats.responseRate, suffix: '%', color: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map((item, i) => (
                  <div key={i} className={`${item.color} p-5 rounded-2xl`}>
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-xl font-black text-foreground">
                      <AnimatedCounter value={item.value} decimalPlaces={item.value % 1 !== 0 ? 1 : 0} suffix={item.suffix} />
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            {stats.totalReviews > 0 && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <h3 className="text-lg font-black mb-4">Rating distribution</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((r) => {
                    const count = ratingDistribution[r] ?? 0;
                    const pct = stats.totalReviews ? (count / stats.totalReviews) * 100 : 0;
                    return (
                      <div key={r} className="flex items-center gap-3">
                        <span className="text-sm font-bold w-8">{r} <Star size={12} className="inline text-amber-500" fill="currentColor" /></span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.2 + r * 0.05 }}
                            className="h-full bg-amber-400 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </div>

          {/* Main: Listings + Reviews */}
          <div className="lg:col-span-2 space-y-14">
            {/* Top Picks from this Seller */}
            {Array.isArray(topPicks) && topPicks.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl bg-emerald-50/60 border border-emerald-100 p-6 sm:p-8 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <span className="inline-block w-1.5 h-6 bg-emerald-500 rounded-full" />
                    Top Picks from this Seller
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium uppercase tracking-widest">
                    Based on rentals & reviews
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {topPicks
                    .map((tp) => products.find((p) => p._id === tp.productId))
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((product) => (
                      <div
                        key={product._id}
                        className="bg-card rounded-3xl border border-border shadow-sm dark:shadow-black/20"
                      >
                        <ProductCard
                          product={{
                            ...product,
                            seller: {
                              _id: seller._id,
                              name: seller.name,
                              avatar: seller.avatar,
                              location: seller.location,
                            },
                          }}
                        />
                      </div>
                    ))}
                </div>
              </motion.section>
            )}

            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <Package size={20} className="text-emerald-600" /> Listings ({products.length})
              </h3>
              {products.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={{ ...product, seller: { _id: seller._id, name: seller.name, avatar: seller.avatar, location: seller.location } }} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center rounded-3xl border-2 border-dashed border-border bg-muted/30">
                  <Package className="mx-auto text-muted-foreground mb-4" size={48} />
                  <p className="text-muted-foreground font-medium">No active listings yet.</p>
                </div>
              )}
            </motion.section>

            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-black">Reviews ({data.totalReviews})</h3>
                {authUser?.role === 'user' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!eligibleOrderId) return toast.error('Review is available after order completion');
                      setReviewModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-2xl bg-secondary text-secondary-foreground text-sm font-bold hover:bg-accent transition-all"
                  >
                    Write a Review
                  </button>
                )}
              </div>
              {reviews.length > 0 ? (
                <>
                  <div className="space-y-5">
                    {reviews.map((review) => (
                      <div
                        key={review._id}
                        className="p-6 bg-muted/50 rounded-2xl border border-border space-y-4"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                <Image
                                  src={review.reviewerId?.avatar || DEFAULT_RENTER_AVATAR}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{review.reviewerId?.name ?? 'Renter'}</p>
                                <div className="flex items-center gap-1 text-amber-500">
                                  {[1, 2, 3, 4, 5].map((r) => (
                                    <Star key={r} size={14} fill={r <= review.rating ? 'currentColor' : 'none'} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{review.review}</p>
                        </div>

                        {review.reply ? (
                          <div className="mt-3 pl-4 border-l-2 border-emerald-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                <Image
                                  src={seller.avatar || DEFAULT_AVATAR}
                                  alt={seller.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{seller.name}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  Seller response
                                </span>
                                {review.reply.createdAt && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(review.reply.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {review.reply.comment}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {hasMoreReviews && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={loadMoreReviews}
                        disabled={reviewsLoading}
                        className="px-6 py-3 bg-secondary text-secondary-foreground rounded-2xl font-bold hover:bg-accent transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                      >
                        {reviewsLoading ? <Loader2 className="animate-spin" size={18} /> : 'Load more reviews'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-16 text-center rounded-3xl border-2 border-dashed border-border bg-muted/30">
                  <Star className="mx-auto text-muted-foreground mb-4" size={48} />
                  <p className="text-muted-foreground font-medium">No reviews yet.</p>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </div>

      <Footer />

      <AnimatePresence>
        {reviewModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl dark:shadow-black/40 z-50 p-8"
            >
              <h3 className="text-xl font-black mb-2 text-foreground">Review seller</h3>
              <p className="text-muted-foreground text-sm mb-6">{seller?.name}</p>
              <div className="flex gap-1 mb-4 text-amber-500">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} onClick={() => setReviewRating(r)} className="p-1" aria-label={`Rate ${r} stars`}>
                    <Star size={32} className={r <= reviewRating ? 'fill-amber-500' : ''} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Your review (optional)"
                className="w-full h-24 px-4 py-3 rounded-2xl border border-border bg-input text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-ring outline-none"
              />
              <div className="flex gap-3 mt-6">
                <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 rounded-2xl border border-border font-bold text-foreground hover:bg-secondary">Cancel</button>
                <button onClick={submitSellerReview} disabled={reviewSubmitting} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {reviewSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Submit'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

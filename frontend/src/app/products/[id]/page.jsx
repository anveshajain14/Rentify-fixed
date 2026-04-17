'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { addViewed } from '@/store/slices/recentlyViewedSlice';
import ProductCard from '@/components/ProductCard';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Star, Loader2, ChevronLeft, ChevronRight, ShoppingCart, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const inWishlist = id ? useSelector((s) => s.wishlist.productIds.includes(id)) : false;
  const recentIds = useSelector((s) => s.recentlyViewed.productIds).filter((pid) => pid !== id);
  const [recentProducts, setRecentProducts] = useState([]);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [addToCartDuration, setAddToCartDuration] = useState('day');
  const [similarItems, setSimilarItems] = useState([]);

  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [productReviews, setProductReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [eligibleOrderId, setEligibleOrderId] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/api/products/${id}`);
        setProduct(res.data.product);
        if (id) dispatch(addViewed(id));
      } catch (err) {
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id, dispatch]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/reviews/product/${id}`)
      .then((res) => {
        setReviewStats(res.data?.stats || { averageRating: 0, totalReviews: 0 });
        setProductReviews(Array.isArray(res.data?.reviews) ? res.data.reviews : []);
      })
      .catch(() => {
        setReviewStats({ averageRating: 0, totalReviews: 0 });
        setProductReviews([]);
      });
  }, [id]);

  useEffect(() => {
    if (!user || !id) {
      setEligibleOrderId(null);
      return;
    }
    // Eligibility: renter must have a completed order for this product
    api
      .get('/api/order-request')
      .then((res) => {
        const orders = res.data?.orders || [];
        const match = orders.find(
          (o) =>
            o &&
            (o.status === 'completed') &&
            String(o.productId) === String(id) &&
            String(o.renterId) === String(user?._id || user?.id)
        );
        setEligibleOrderId(match?._id || null);
      })
      .catch(() => setEligibleOrderId(null));
  }, [user, id]);

  const handleSubmitProductReview = async () => {
    if (!eligibleOrderId) return toast.error('You can review only after order completion');
    setReviewSubmitting(true);
    try {
      await api.post('/api/reviews', {
        orderId: eligibleOrderId,
        targetType: 'product',
        targetId: id,
        rating: reviewRating,
        review: reviewText,
      });
      toast.success('Review submitted');
      setReviewModalOpen(false);
      setReviewText('');
      setReviewRating(5);
      const r = await api.get(`/api/reviews/product/${id}`);
      setReviewStats(r.data?.stats || { averageRating: 0, totalReviews: 0 });
      setProductReviews(Array.isArray(r.data?.reviews) ? r.data.reviews : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    if (recentIds.length === 0) return;
    api.get('/api/products?approved=true').then((res) => {
      const all = res.data.products || [];
      setRecentProducts(all.filter((p) => recentIds.includes(p._id)).slice(0, 4));
    });
  }, [recentIds.join(',')]);

  // AI-powered similar items (Python recommendation service via /api/ai/similar)
  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/ai/similar?itemId=${id}`)
      .then((res) => {
        const items = res.data?.similarItems || [];
        setSimilarItems(items);
      })
      .catch(() => {
        // Silent fail – we don't want to break the product page if AI is down.
      });
  }, [id]);

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please login to rent');
      return router.push('/login');
    }
    if (!startDate || !endDate) return toast.error('Please select dates');
    setBookingLoading(true);
    try {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) return toast.error('Invalid dates');
      const totalAmount = days * product.pricePerDay;
      const res = await api.post('/api/rentals', {
        productId: product._id,
        startDate,
        endDate,
        totalAmount,
      });
      const checkoutRes = await api.post('/api/rentals/checkout', {
        rentalId: res.data.rental._id,
        totalAmount,
      });
      if (checkoutRes.data.url) window.location.href = checkoutRes.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddToCart = () => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + (addToCartDuration === 'day' ? 1 : addToCartDuration === 'week' ? 7 : 30));
    const cartProduct = {
      _id: product._id,
      title: product.title,
      images: product.images || [],
      pricePerDay: product.pricePerDay,
      pricePerWeek: product.pricePerWeek,
      pricePerMonth: product.pricePerMonth,
      category: product.category,
      seller: product.seller && { _id: product.seller._id, name: product.seller.name, avatar: product.seller.avatar },
    };
    dispatch(addToCart({
      productId: product._id,
      product: cartProduct,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      duration: addToCartDuration,
    }));
    toast.success('Added to cart');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-emerald-600 dark:text-cyan-400" size={48} /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-xl font-bold bg-background text-foreground">Product not found</div>;

  const images = product.images?.length ? product.images : ['https://via.placeholder.com/800'];
  const availability = product.availability || [];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Gallery carousel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-2xl dark:shadow-black/30 bg-muted">
              <AnimatePresence mode="wait">
                <motion.div
                  key={galleryIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <Image src={images[galleryIndex]} alt={product.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                </motion.div>
              </AnimatePresence>
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIndex((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/90 backdrop-blur shadow-lg flex items-center justify-center hover:bg-card text-foreground"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() => setGalleryIndex((i) => (i + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/90 backdrop-blur shadow-lg flex items-center justify-center hover:bg-card text-foreground"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${galleryIndex === i ? 'border-emerald-500 dark:border-cyan-500 ring-2 ring-emerald-200 dark:ring-cyan-500/30' : 'border-border'}`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-6 flex items-center gap-2">
              <span className="px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-bold">{product.category}</span>
              <button
                onClick={() => { dispatch(toggleWishlist(product._id)); toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist'); }}
                className="p-2 rounded-full border border-border hover:bg-muted"
              >
                <Heart size={20} className={inWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'} />
              </button>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground mb-4">{product.title}</h1>
            <div className="flex items-center gap-6 text-muted-foreground mb-6">
              {reviewStats.totalReviews > 0 ? (
                <span className="flex items-center gap-1 text-amber-500">
                  <Star size={18} fill="currentColor" />
                  <span className="text-foreground font-bold">{Number(reviewStats.averageRating || 0).toFixed(1)}</span>
                  <span className="text-sm">({reviewStats.totalReviews} reviews)</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground font-medium">No ratings yet</span>
              )}
              {product.seller?.location && <span className="flex items-center gap-1"><MapPin size={18} /> {product.seller.location}</span>}
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">{product.description}</p>

            <div className="mb-8 flex items-center gap-3">
              <button
                onClick={() => {
                  if (!user) return router.push('/login');
                  if (!eligibleOrderId) return toast.error('Review is available after order completion');
                  setReviewModalOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold hover:bg-accent transition-all"
              >
                Write a Review
              </button>
            </div>

            {/* Seller block */}
            <Link href={`/seller/${product.seller?._id}`} className="flex items-center justify-between p-6 bg-muted/50 rounded-3xl mb-8 border border-border hover:border-emerald-500/50 dark:hover:border-cyan-500/50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-border shadow-md">
                  <Image src={product.seller?.avatar || 'https://via.placeholder.com/150'} alt={product.seller?.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-cyan-400">{product.seller?.name}</h4>
                  <p className="text-xs text-muted-foreground">Member since {new Date(product.seller?.joinedAt).getFullYear()}</p>
                </div>
              </div>
              <span className="px-4 py-2 bg-card rounded-xl text-xs font-bold shadow-sm text-foreground">View Shop</span>
            </Link>

            {/* Pricing by duration */}
            <div className="flex gap-3 mb-6">
              {[
                { key: 'day', label: 'Per day', value: product.pricePerDay },
                { key: 'week', label: 'Per week', value: product.pricePerWeek },
                { key: 'month', label: 'Per month', value: product.pricePerMonth },
              ].filter((d) => d.value != null).map((d) => (
                <div key={d.key} className="flex-1 p-4 rounded-2xl bg-muted/50 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase">{d.label}</p>
                  <p className="text-xl font-black text-foreground">${d.value}</p>
                </div>
              ))}
            </div>

            {/* Security deposit */}
            {(product.securityDeposit != null && Number(product.securityDeposit) > 0) && (
              <div className="mb-6 p-4 rounded-2xl bg-muted/50 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase">Security deposit (refundable)</p>
                <p className="text-xl font-black text-foreground">${Number(product.securityDeposit).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Refunded after return verification.</p>
              </div>
            )}

            {/* Availability */}
            {availability.length > 0 && (
              <div className="mb-8 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2"><Calendar size={16} /> Blocked dates</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {availability.slice(0, 5).map((b, i) => (
                    <li key={i}>
                      {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                    </li>
                  ))}
                  {availability.length > 5 && <li>+{availability.length - 5} more</li>}
                </ul>
              </div>
            )}

            {/* Booking card */}
            <div className="bg-primary text-primary-foreground p-8 rounded-[40px] shadow-2xl shadow-emerald-900/20 dark:shadow-black/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full -mr-16 -mt-16" />
              <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                  <span className="text-4xl font-black">${product.pricePerDay}</span>
                  <span className="text-gray-400"> / day</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Start</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">End</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <button onClick={handleBooking} disabled={bookingLoading} className="w-full py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-black hover:bg-emerald-500 dark:hover:bg-cyan-500 flex items-center justify-center gap-2 mb-4">
                {bookingLoading ? <Loader2 className="animate-spin" /> : 'Rent Now'}
              </button>

              <div className="flex gap-2 relative z-10">
                <select value={addToCartDuration} onChange={(e) => setAddToCartDuration(e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm outline-none">
                  <option value="day">1 day</option>
                  <option value="week">1 week</option>
                  <option value="month">1 month</option>
                </select>
                <button onClick={handleAddToCart} className="flex-1 py-3 rounded-2xl border border-white/30 font-bold flex items-center justify-center gap-2 hover:bg-white/10">
                  <ShoppingCart size={18} /> Add to Cart
                </button>
              </div>
              <p className="text-center text-[10px] text-primary-foreground/70 mt-4 uppercase tracking-widest font-bold">Secure checkout with Stripe</p>
            </div>
          </motion.div>
        </div>

        {recentProducts.length > 0 && (
          <section className="mt-20 pt-16 border-t border-border">
            <h2 className="text-xl font-black mb-6 text-foreground">You may also like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

        {similarItems.length > 0 && (
          <section className="mt-16 pt-12 border-t border-border">
            <h2 className="text-xl font-black mb-6 text-foreground">Similar items</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarItems.map((item) => (
                <ProductCard
                  key={item._id}
                  product={{
                    ...item,
                    images: item.images || [item.image],
                    pricePerDay: item.pricePerDay || item.price,
                    category: item.category || product.category,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />

      <AnimatePresence>
        {reviewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 10, opacity: 0 }}
              className="w-full max-w-lg bg-card rounded-[32px] border border-border shadow-2xl p-7"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-xl font-black text-foreground">Review this product</h3>
                  <p className="text-sm text-muted-foreground">{product?.title}</p>
                </div>
                <button onClick={() => setReviewModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} onClick={() => setReviewRating(r)} className="p-1" aria-label={`Rate ${r} stars`}>
                    <Star size={28} className={r <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-muted'} />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your experience (optional)"
                className="w-full min-h-[110px] bg-muted/40 border border-border rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold hover:bg-accent transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitProductReview}
                  disabled={reviewSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

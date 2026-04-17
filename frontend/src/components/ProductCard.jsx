'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Star, MapPin, Clock, ShoppingCart, Heart, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { addToCart } from '@/store/slices/cartSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import api from '@/lib/api';

function getAvailabilityBadge(product) {
  const blocks = product?.availability || [];
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { label: 'Available today', tone: 'available' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  let isBlockedToday = false;
  let earliestFutureEnd = null;

  for (const b of blocks) {
    if (!b?.startDate || !b?.endDate) continue;
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const s = start.getTime();
    const e = end.getTime();
    if (todayTime >= s && todayTime <= e) {
      isBlockedToday = true;
      if (!earliestFutureEnd || e < earliestFutureEnd) earliestFutureEnd = e;
    } else if (e >= todayTime) {
      if (!earliestFutureEnd || e < earliestFutureEnd) earliestFutureEnd = e;
    }
  }

  if (!isBlockedToday) {
    return { label: 'Available today', tone: 'available' };
  }

  if (earliestFutureEnd) {
    const nextAvailable = new Date(earliestFutureEnd);
    nextAvailable.setDate(nextAvailable.getDate() + 1);
    const formatted = nextAvailable.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return { label: `Will be available ${formatted}`, tone: 'soon' };
  }

  return null;
}

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const inWishlist = useSelector((s) => s.wishlist.productIds.includes(product._id));
  const currentUser = useSelector((s) => s.auth.user);
  const sellerId = product.seller?._id ?? product.seller;
  const sellerName = typeof product.seller === 'object' && product.seller?.name;
  const sellerAvatar = typeof product.seller === 'object' && product.seller?.avatar;
  const sellerLocation = typeof product.seller === 'object' && product.seller?.location;
  const availabilityBadge = getAvailabilityBadge(product);

  const cartProduct = {
    _id: product._id,
    title: product.title,
    images: product.images || [],
    pricePerDay: product.pricePerDay,
    pricePerWeek: product.pricePerWeek,
    pricePerMonth: product.pricePerMonth,
    category: product.category,
    seller: product.seller && (typeof product.seller === 'object' ? { _id: product.seller._id, name: product.seller.name, avatar: product.seller.avatar } : undefined),
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sellerIdForProduct = typeof product.seller === 'object' ? product.seller?._id : product.seller;

    // Role-based cart restriction: sellers cannot rent their own listings.
    if (currentUser?.role === 'seller' && currentUser.id && sellerIdForProduct && String(currentUser.id) === String(sellerIdForProduct)) {
      toast.error("Sellers can't add their own listings to the cart.");
      return;
    }
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 1);
    dispatch(addToCart({
      productId: product._id,
      product: cartProduct,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      duration: 'day',
    }));
    toast.success('Added to cart. Set dates in Cart.');
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWishlist(product._id));
    toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleChatSeller = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast.error('Please login to chat with seller');
      router.push('/login');
      return;
    }

    if (!sellerId) {
      toast.error('Seller not available');
      return;
    }

    if (String(currentUser.id) === String(sellerId)) {
      toast.error('You cannot chat with yourself');
      return;
    }

    try {
      const res = await api.post('/api/chat/conversation', { sellerId });
      const conversationId = res.data?.conversation?._id;
      if (!conversationId) {
        toast.error('Failed to start chat');
        return;
      }
      router.push(`/chat?conversationId=${conversationId}&productId=${product._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start chat');
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group bg-card rounded-3xl overflow-hidden border border-border hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-300"
    >
      <Link href={`/products/${product._id}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <Image
            src={product.images?.[0] || '/placeholder-avatar.svg'}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className="px-3 py-1 bg-card/90 backdrop-blur-md rounded-full text-xs font-bold text-foreground shadow-sm">
              {product.category}
            </span>
            {availabilityBadge && (
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-semibold shadow-sm ${
                  availabilityBadge.tone === 'available'
                    ? 'bg-emerald-600 dark:bg-cyan-600 text-white'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                }`}
              >
                {availabilityBadge.label}
              </span>
            )}
          </div>
          <button
            onClick={handleWishlist}
            className="absolute top-4 right-4 p-2 rounded-full bg-card/90 backdrop-blur-md shadow-sm hover:bg-card"
          >
            <Heart size={18} className={inWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'} />
          </button>
        </div>
      </Link>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/products/${product._id}`}>
            <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-cyan-400 transition-colors">
              {product.title}
            </h3>
          </Link>
          {(product.rating ?? product.averageRating) != null && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star size={14} fill="currentColor" />
              <span className="text-sm font-bold text-muted-foreground">{(product.rating ?? product.averageRating).toFixed(1)}</span>
            </div>
          )}
        </div>

        {sellerId && (
          <Link
            href={`/seller/${sellerId}`}
            className="flex items-center gap-2 text-muted-foreground text-sm mb-4 hover:text-emerald-600 dark:hover:text-cyan-400 transition-colors group/seller"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border flex-shrink-0">
              <Image
                src={sellerAvatar || '/placeholder-avatar.svg'}
                alt={sellerName || 'Seller'}
                width={24}
                height={24}
                className="object-cover group-hover/seller:ring-2 group-hover/seller:ring-emerald-500 dark:group-hover/seller:ring-cyan-500 rounded-full"
              />
            </div>
            <span className="font-medium text-muted-foreground group-hover/seller:text-emerald-600 dark:group-hover/seller:text-cyan-400 truncate">{sellerName || 'Seller'}</span>
            {sellerLocation && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="flex items-center gap-0.5"><MapPin size={12} /> {sellerLocation}</span>
              </>
            )}
          </Link>
        )}
        {!sellerId && (
          <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{product.seller?.location || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Verified</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border gap-2">
          <div>
            <span className="text-2xl font-black text-foreground">₹{product.pricePerDay}</span>
            <span className="text-muted-foreground text-sm"> / day</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleChatSeller}
              className="p-2 rounded-xl border border-border hover:bg-accent"
              title="Chat with seller"
            >
              <MessageCircle size={18} className="text-muted-foreground" />
            </button>
            <button
              onClick={handleAddToCart}
              className="p-2 rounded-xl border border-border hover:bg-accent"
              title="Add to cart"
            >
              <ShoppingCart size={18} className="text-muted-foreground" />
            </button>
            <Link
              href={`/products/${product._id}`}
              className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-cyan-400 rounded-xl text-sm font-bold hover:bg-emerald-600 dark:hover:bg-cyan-600 hover:text-white transition-all"
            >
              Rent Now
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

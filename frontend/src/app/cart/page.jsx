'use client';

import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, updateCartItemDates, clearCart } from '@/store/slices/cartSlice';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2, Clock3, CheckCircle2, XCircle, IndianRupee } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import OrderTimeline from '@/components/OrderTimeline';

function getTotalForItem(item) {
  const start = new Date(item.startDate).getTime();
  const end = new Date(item.endDate).getTime();
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  if (item.duration === 'week') {
    const weeks = Math.ceil(days / 7);
    return weeks * (item.product.pricePerWeek ?? item.product.pricePerDay * 7);
  }
  if (item.duration === 'month') {
    const months = Math.ceil(days / 30);
    return months * (item.product.pricePerMonth ?? item.product.pricePerDay * 30);
  }
  return days * item.product.pricePerDay;
}

export default function CartPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const [tab, setTab] = useState(searchParams.get('tab') || 'cart');
  const [orderRequests, setOrderRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setTab(searchParams.get('tab') || 'cart');
  }, [searchParams]);

  const fetchHistory = async () => {
    if (!user) {
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await api.get('/api/order-request');
      setOrderRequests(res.data?.orderRequests || []);
      setOrders(res.data?.orders || []);
    } catch {
      setOrderRequests([]);
      setOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const subtotal = items.reduce((sum, it) => sum + getTotalForItem(it), 0);
  const pendingRequests = useMemo(
    () => orderRequests.filter((r) => r.status === 'pending'),
    [orderRequests]
  );
  const acceptedRejected = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => map.set(String(o.orderRequestId), o));
    return orderRequests.filter((r) => r.status !== 'pending').map((r) => ({ request: r, order: map.get(String(r._id)) }));
  }, [orderRequests, orders]);

  const handleRentNow = () => {
    if (!user) {
      toast.error('Please login to continue');
      return router.push('/login');
    }
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    router.push('/checkout');
  };

  const handlePayNow = (orderId) => {
    router.push(`/payment/${orderId}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <h1 className="text-3xl font-black tracking-tighter text-foreground mb-6 flex items-center gap-2">
          <ShoppingCart size={32} /> My Rentals
        </h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('cart')} className={`px-5 py-2.5 rounded-2xl text-sm font-bold ${tab === 'cart' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>Cart</button>
          <button onClick={() => setTab('requests')} className={`px-5 py-2.5 rounded-2xl text-sm font-bold ${tab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>Order Requests</button>
          <button onClick={() => setTab('orders')} className={`px-5 py-2.5 rounded-2xl text-sm font-bold ${tab === 'orders' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>Orders</button>
        </div>

        {tab === 'cart' && (
          <>
            {items.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center bg-card rounded-3xl border border-dashed border-border">
                <ShoppingCart className="mx-auto text-muted-foreground mb-4" size={56} />
                <p className="text-muted-foreground font-medium mb-4">Your cart is empty</p>
                <Link href="/products" className="inline-block px-8 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500">Browse rentals</Link>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-3xl border border-border p-6 shadow-sm dark:shadow-black/20 flex flex-col sm:flex-row gap-6"
                  >
                    <div className="relative w-full sm:w-32 aspect-square rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                      <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.productId}`} className="font-bold text-lg text-foreground hover:text-emerald-600 dark:hover:text-cyan-400 line-clamp-1">
                        {item.product.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mb-4">₹{item.product.pricePerDay}/day</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Start</label>
                          <input
                            type="date"
                            value={item.startDate}
                            onChange={(e) => dispatch(updateCartItemDates({ productId: item.productId, startDate: e.target.value, endDate: item.endDate, duration: item.duration }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">End</label>
                          <input
                            type="date"
                            value={item.endDate}
                            onChange={(e) => dispatch(updateCartItemDates({ productId: item.productId, startDate: item.startDate, endDate: e.target.value, duration: item.duration }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase">Duration</label>
                          <select
                            value={item.duration}
                            onChange={(e) => dispatch(updateCartItemDates({ productId: item.productId, startDate: item.startDate, endDate: item.endDate, duration: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm"
                          >
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col justify-between sm:items-end gap-2">
                      <p className="text-xl font-black text-foreground">₹{getTotalForItem(item).toFixed(2)}</p>
                      <button onClick={() => dispatch(removeFromCart(item.productId))} className="p-2 rounded-xl text-destructive hover:bg-destructive/10">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
                <div className="bg-card rounded-3xl border border-border p-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-6">
                  <div>
                    <p className="text-muted-foreground font-medium">Subtotal</p>
                    <p className="text-3xl font-black text-foreground">₹{subtotal.toFixed(2)}</p>
                  </div>
                  <button onClick={handleRentNow} className="px-10 py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500 flex items-center justify-center gap-2">
                    Rent Now
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'requests' && (
          <section className="space-y-4">
            {loadingHistory ? (
              <div className="bg-card rounded-3xl border border-border p-8 text-muted-foreground">Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border p-8 text-muted-foreground">No pending order requests.</div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req._id} className="bg-card rounded-3xl border border-border p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-foreground">{req.productId?.title || 'Product'}</p>
                      <p className="text-sm text-muted-foreground">Days: {req.days} · {req.deliveryType === 'delivery' ? 'Delivery' : 'Self pickup'}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1"><Clock3 size={12} /> Pending</span>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground flex items-center gap-1"><IndianRupee size={14} /> Total: {Number(req.totalAmount || 0).toFixed(2)}</div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="space-y-4">
            {loadingHistory ? (
              <div className="bg-card rounded-3xl border border-border p-8 text-muted-foreground">Loading orders...</div>
            ) : acceptedRejected.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border p-8 text-muted-foreground">No accepted/rejected orders yet.</div>
            ) : (
              acceptedRejected.map(({ request, order }) => (
                <div key={request._id} className="bg-card rounded-3xl border border-border p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-foreground">{request.productId?.title || 'Product'}</p>
                      <p className="text-sm text-muted-foreground">Days: {request.days} · Total: ₹{Number(request.totalAmount || 0).toFixed(2)}</p>
                    </div>
                    {request.status === 'accepted' ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1"><CheckCircle2 size={12} /> Accepted</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1"><XCircle size={12} /> Rejected</span>
                    )}
                  </div>

                  {request.status === 'rejected' && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-red-600 dark:text-red-400">Reason: {request.rejectionReason || 'Not specified'}</p>
                      <button onClick={() => router.push('/checkout')} className="px-4 py-2 rounded-xl border border-border font-bold text-sm">
                        Edit & Request Again
                      </button>
                    </div>
                  )}

                  {request.status === 'accepted' && (
                    <div className="mt-4">
                      {order && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Deposit: ₹{Number(order.depositAmount || order.cautionMoney || 0).toFixed(2)} · Status: {order.depositStatus || 'held'}
                        </p>
                      )}
                      {order?.status && (
                        <div className="mb-4">
                          <OrderTimeline status={order.status} paymentStatus={order.paymentStatus} />
                        </div>
                      )}
                      {order && order.paymentStatus === 'done' ? (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">Payment completed</p>
                      ) : (
                        <button
                          onClick={() => order && handlePayNow(order._id)}
                          disabled={!order}
                          className="px-5 py-2.5 bg-emerald-600 dark:bg-cyan-600 text-white rounded-xl font-bold disabled:opacity-50"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}

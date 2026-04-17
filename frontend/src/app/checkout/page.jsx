'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart, removeFromCart } from '@/store/slices/cartSlice';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  MapPin,
  Truck,
  CreditCard,
  Loader2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

function getTotalForItem(item) {
  const start = new Date(item.startDate).getTime();
  const end = new Date(item.endDate).getTime();
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  if (item.duration === 'week') {
    const weeks = Math.ceil(days / 7);
    return weeks * (item.product?.pricePerWeek ?? item.product?.pricePerDay * 7);
  }
  if (item.duration === 'month') {
    const months = Math.ceil(days / 30);
    return months * (item.product?.pricePerMonth ?? item.product?.pricePerDay * 30);
  }
  return days * (item.product?.pricePerDay || 0);
}

function getDays(item) {
  const start = new Date(item.startDate).getTime();
  const end = new Date(item.endDate).getTime();
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [productsExtra, setProductsExtra] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [formAddress, setFormAddress] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  const [deliveryType, setDeliveryType] = useState('selfPickup');

  const productIds = [...new Set(items.map((i) => i.productId))];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    const load = async () => {
      try {
        const [addrRes, ...productResList] = await Promise.all([
          api.get('/api/user/addresses'),
          ...productIds.map((id) => api.get(`/api/products/${id}`).catch(() => ({ data: {} }))),
        ]);
        setAddresses(addrRes.data?.addresses || []);
        const byId = {};
        productResList.forEach((r, idx) => {
          const id = productIds[idx];
          if (r.data?.product) byId[id] = r.data.product;
        });
        setProductsExtra(byId);
        const defaultAddr = (addrRes.data?.addresses || []).find((a) => a.isDefault) || (addrRes.data?.addresses || [])[0];
        if (defaultAddr) setSelectedAddress(defaultAddr);
        if ((addrRes.data?.addresses || []).length === 0) setShowAddAddress(true);
      } catch (e) {
        toast.error('Failed to load checkout data');
        router.push('/cart');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, items.length, router]);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/user/addresses', formAddress);
      toast.success('Address added');
      const res = await api.get('/api/user/addresses');
      setAddresses(res.data?.addresses || []);
      const updated = (res.data?.addresses || []).slice(-1)[0];
      if (updated) setSelectedAddress(updated);
      setShowAddAddress(false);
      setFormAddress({ fullName: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    }
  };

  const deliveryCharge = deliveryType === 'delivery' ? 100 : 0;
  const totalRent = items.reduce((s, it) => s + getTotalForItem(it), 0);
  const totalCaution = items.reduce((s, it) => s + (Number(productsExtra[it.productId]?.securityDeposit) || 0), 0);
  const totalAmount = totalRent + deliveryCharge + totalCaution;

  const canSubmit = selectedAddress != null;
  const addressSnapshot = selectedAddress
    ? {
        fullName: selectedAddress.fullName || selectedAddress.name,
        phone: selectedAddress.phone,
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      }
    : null;

  const submitOrderRequests = async () => {
    if (!canSubmit) {
      toast.error('Please select or add an address');
      return;
    }
    setSubmitting(true);
    try {
      const created = [];
      for (const it of items) {
        const cautionMoney = Number(productsExtra[it.productId]?.securityDeposit) || 0;
        const payload = {
          productId: it.productId,
          days: getDays(it),
          deliveryType,
          address: addressSnapshot,
          deliveryCharge,
          totalAmount: getTotalForItem(it) + deliveryCharge + cautionMoney,
          cautionMoney,
        };
        const res = await api.post('/api/order-request', payload);
        created.push(res.data?.orderRequest);
      }

      dispatch(clearCart());
      toast.success('Order request submitted to seller');
      router.push('/cart?tab=requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit order request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-emerald-600 dark:text-cyan-400" size={40} />
        </div>
        <Footer />
      </main>
    );
  }

  const steps = ['Pickup / Delivery', 'Address', 'Order Summary'];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <h1 className="text-3xl font-black tracking-tighter text-foreground mb-4">Rent Now</h1>
        <div className="flex items-center gap-2 mb-8">
          {steps.map((label, i) => {
            const idx = i + 1;
            const active = step === idx;
            const done = step > idx;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center ${done || active ? 'bg-emerald-600 dark:bg-cyan-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {idx}
                </div>
                <span className={`text-xs sm:text-sm font-bold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                {i < steps.length - 1 && <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Truck className="text-emerald-600 dark:text-cyan-400" size={24} />
              <h2 className="text-xl font-bold text-foreground">Pickup or Delivery</h2>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setDeliveryType('selfPickup')}
                className={`w-full text-left p-4 rounded-2xl border-2 ${deliveryType === 'selfPickup' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'}`}
              >
                <p className="font-bold text-foreground">Self Pickup</p>
                <p className="text-sm text-muted-foreground">Pickup from seller location</p>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`w-full text-left p-4 rounded-2xl border-2 ${deliveryType === 'delivery' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'}`}
              >
                <p className="font-bold text-foreground">Delivery</p>
                <p className="text-sm text-muted-foreground">Fixed delivery charge: ₹100</p>
              </button>
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-6 w-full py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold"
            >
              Continue
            </button>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="text-emerald-600 dark:text-cyan-400" size={24} />
              <h2 className="text-xl font-bold text-foreground">Select address</h2>
            </div>

            {showAddAddress ? (
              <form onSubmit={handleSaveAddress} className="space-y-4">
                <input
                  type="text"
                  placeholder="Full name"
                  value={formAddress.fullName}
                  onChange={(e) => setFormAddress((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formAddress.phone}
                  onChange={(e) => setFormAddress((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                  required
                />
                <input
                  type="text"
                  placeholder="Street address"
                  value={formAddress.street}
                  onChange={(e) => setFormAddress((p) => ({ ...p, street: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={formAddress.city}
                    onChange={(e) => setFormAddress((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formAddress.state}
                    onChange={(e) => setFormAddress((p) => ({ ...p, state: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Pincode"
                  value={formAddress.pincode}
                  onChange={(e) => setFormAddress((p) => ({ ...p, pincode: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                  required
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formAddress.isDefault}
                    onChange={(e) => setFormAddress((p) => ({ ...p, isDefault: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-muted-foreground">Set as default</span>
                </label>
                <div className="flex gap-3">
                  <button type="submit" className="px-6 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-xl font-bold">
                    Save address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAddress(false);
                      setFormAddress({ fullName: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false });
                    }}
                    className="px-6 py-3 border border-border rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {addresses.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr._id}
                        onClick={() => setSelectedAddress(addr)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                          selectedAddress?._id === addr._id
                            ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20'
                            : 'border-border hover:border-emerald-400 dark:hover:border-cyan-500'
                        }`}
                      >
                        <p className="font-bold text-foreground">{addr.fullName || addr.name}</p>
                        <p className="text-sm text-muted-foreground">{addr.street}, {addr.city}, {addr.state} {addr.pincode}</p>
                        <p className="text-sm text-muted-foreground">{addr.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddAddress(true)}
                  className="text-emerald-600 dark:text-cyan-400 font-bold text-sm"
                >
                  + Add new address
                </button>
              </>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-border rounded-xl font-medium">Back</button>
              <button onClick={() => setStep(3)} className="px-6 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-xl font-bold">Continue</button>
            </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-emerald-600 dark:text-cyan-400" size={24} />
              <h2 className="text-xl font-bold text-foreground">Order summary</h2>
            </div>
            <div className="space-y-4 mb-4">
              {items.map((it) => {
                const days = getDays(it);
                const total = getTotalForItem(it);
                const ppd = Number(it.product?.pricePerDay || 0);
                const caution = Number(productsExtra[it.productId]?.securityDeposit || 0);
                return (
                  <div key={it.productId} className="p-4 rounded-2xl border border-border">
                    <p className="font-bold text-foreground">{it.product?.title}</p>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <div className="flex justify-between"><span>Price per day</span><span>₹{ppd}</span></div>
                      <div className="flex justify-between"><span>Days</span><span>{days}</span></div>
                      <div className="flex justify-between"><span>Total rent</span><span>₹{total}</span></div>
                      <div className="flex justify-between"><span>Caution money</span><span>₹{caution}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 text-muted-foreground mb-4">
              <div className="flex justify-between"><span>Rent total</span><span className="text-foreground font-medium">₹{totalRent}</span></div>
              <div className="flex justify-between"><span>Delivery charge</span><span className="text-foreground font-medium">₹{deliveryCharge}</span></div>
              <div className="flex justify-between"><span>Caution money</span><span className="text-foreground font-medium">₹{totalCaution}</span></div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between text-lg font-bold text-foreground mb-4">
              <span>Grand total</span>
              <span>₹{totalAmount}</span>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 mb-5 space-y-1">
              <p>Caution money will be refunded after return.</p>
              <p>Late fee applicable on delayed return.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-border rounded-xl font-medium">Back</button>
              <button
                onClick={submitOrderRequests}
                disabled={!canSubmit || submitting}
                className="flex-1 py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  <>Submit Request <ChevronRight size={20} /></>
                )}
              </button>
            </div>
            {!canSubmit && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertCircle size={14} /> Please select/add an address.</p>
            )}
          </motion.section>
        )}

        <Link href="/cart" className="text-muted-foreground hover:text-foreground text-sm">← Back to cart</Link>
      </div>
      <Footer />
    </main>
  );
}

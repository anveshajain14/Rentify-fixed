'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CreditCard, Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState('cod');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await api.get(`/api/order/${orderId}`);
        setOrder(res.data?.order || null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load order');
      }
    };
    if (orderId) loadOrder();
  }, [orderId]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const existing = document.getElementById('razorpay-checkout-script');
      if (existing) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleCod = async () => {
    await api.post('/api/payment/cod', { orderId });
    toast.success('COD selected');
    router.push('/cart?tab=orders');
  };

  const handleOnline = async () => {
    const ok = await loadRazorpayScript();
    if (!ok) {
      toast.error('Failed to load Razorpay');
      return;
    }
    const amount = Number(order?.totalAmount || 0);
    if (!amount || amount <= 0) {
      toast.error('Invalid order amount');
      return;
    }

    const createRes = await api.post('/api/payment/create-order', {
      orderId,
      amount,
    });
    const data = createRes.data;
    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency || 'INR',
      name: 'Rentify',
      description: `Order ${orderId}`,
      order_id: data.razorpayOrderId,
      handler: async function (response) {
        try {
          await api.post('/api/payment/verify', {
            orderId,
            ...response,
          });
          toast.success('Online payment successful');
          router.push('/cart?tab=orders');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Payment verification failed');
        }
      },
      prefill: {},
      theme: { color: '#10b981' },
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();
  };

  const handlePayNow = async () => {
    setLoading(true);
    try {
      if (method === 'cod') {
        await handleCod();
      } else {
        await handleOnline();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="bg-card rounded-3xl border border-border p-8">
          <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2">Payment</h1>
          <p className="text-muted-foreground mb-8">Choose your preferred payment option.</p>

          <div className="mb-6 p-4 rounded-2xl border border-border bg-muted/40">
            <p className="text-sm text-muted-foreground">Amount Breakdown</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rental Amount</span>
                <span className="font-semibold text-foreground">
                  ₹{Math.max(0, Number(order?.totalAmount || 0) - Number(order?.depositAmount || order?.cautionMoney || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Caution Money</span>
                <span className="font-semibold text-foreground">
                  ₹{Number(order?.depositAmount || order?.cautionMoney || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                <span className="text-foreground font-bold">Total</span>
                <span className="text-2xl font-black text-foreground">₹{Number(order?.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <button
              type="button"
              onClick={() => setMethod('cod')}
              className={`w-full p-4 rounded-2xl border-2 text-left ${method === 'cod' ? 'border-emerald-600 dark:border-cyan-600 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'}`}
            >
              <p className="font-bold text-foreground">Cash on Delivery (COD)</p>
              <p className="text-sm text-muted-foreground">Pay later, seller confirms payment manually.</p>
            </button>
            <button
              type="button"
              onClick={() => setMethod('online')}
              className={`w-full p-4 rounded-2xl border-2 text-left ${method === 'online' ? 'border-emerald-600 dark:border-cyan-600 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'}`}
            >
              <p className="font-bold text-foreground">Online Payment (Razorpay)</p>
              <p className="text-sm text-muted-foreground">Pay instantly using UPI, card, or netbanking.</p>
            </button>
          </div>

          <button
            onClick={handlePayNow}
            disabled={loading || !order}
            className="w-full py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
            {loading ? 'Processing...' : method === 'cod' ? 'Confirm COD' : 'Pay Online'}
          </button>
        </div>
      </div>
      <Footer />
    </main>
  );
}

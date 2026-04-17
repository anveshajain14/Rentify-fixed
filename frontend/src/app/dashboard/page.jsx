'use client';

import { useEffect, useState } from 'react';
import api, { apiBaseUrl } from '@/lib/api';
import { useSelector } from 'react-redux';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import OrderTimeline from '@/components/OrderTimeline';

export default function RenterDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [rentals, setRentals] = useState([]);
  const [orderRequests, setOrderRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // Reviews are order-based now (tied to orderId). Rental-based rating UI removed.

  const fetchOrders = async () => {
    try {
      const requestRes = await api.get('/api/order-request');
      setOrderRequests(requestRes.data?.orderRequests || []);
      setOrders(requestRes.data?.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const [rentalsRes, requestRes] = await Promise.all([
          api.get('/api/rentals'),
          api.get('/api/order-request'),
        ]);
        setRentals(rentalsRes.data.rentals);
        setOrderRequests(requestRes.data?.orderRequests || []);
        setOrders(requestRes.data?.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRentals();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
      case 'pending': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
      case 'failed': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Review submission handled on product/seller pages after order completion.

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name}. Manage your active rentals and history.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { label: 'Active Rentals', value: rentals.filter((r) => r.rentalStatus === 'active').length, icon: <Clock className="text-emerald-500 dark:text-cyan-400" /> },
            { label: 'Total Spent', value: `₹${rentals.reduce((acc, r) => acc + (r.paymentStatus === 'paid' ? r.totalAmount : 0), 0)}`, icon: <ShoppingBag className="text-blue-500" /> },
            { label: 'Completed', value: rentals.filter((r) => r.rentalStatus === 'completed').length, icon: <CheckCircle className="text-purple-500" /> },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-8 rounded-[32px] border border-border shadow-sm dark:shadow-black/20 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-foreground">{stat.value}</p>
              </div>
              <div className="p-4 bg-muted rounded-2xl">{stat.icon}</div>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
          <div className="p-8 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-black text-foreground">My Rental History</h2>
            <button className="text-sm font-bold text-emerald-600 dark:text-cyan-400">Download Report</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-xs font-black text-muted-foreground uppercase tracking-widest">
                  <th className="px-8 py-4">Product</th>
                  <th className="px-8 py-4">Dates</th>
                  <th className="px-8 py-4">Total</th>
                  <th className="px-8 py-4">Payment</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rentals.length > 0 ? (
                  rentals.map((rental) => (
                    <tr key={rental._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img src={rental.product?.images?.[0] || '/placeholder-avatar.svg'} className="w-12 h-12 rounded-xl object-cover" alt="" />
                          <span className="font-bold text-foreground">{rental.product?.title}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-muted-foreground font-medium">
                        {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 font-black text-foreground">₹{rental.totalAmount}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(rental.paymentStatus)}`}>
                          {rental.paymentStatus}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground`}>
                          {rental.rentalStatus}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="flex items-center justify-end gap-3">
                          <a href={`${apiBaseUrl}/api/rentals/${rental._id}/invoice`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground font-medium text-sm">Invoice</a>
                          {rental.rentalStatus === 'completed' ? (
                            <Link href={`/products/${rental.product?._id}`} className="text-foreground font-bold text-sm hover:underline">View Details</Link>
                          ) : (
                            <Link href={`/products/${rental.product?._id}`} className="text-foreground font-bold text-sm hover:underline">View Details</Link>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground italic font-medium">
                      {loading ? 'Loading your rentals...' : 'No rentals yet. Start browsing products!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
          <div className="p-8 border-b border-border">
            <h2 className="text-xl font-black text-foreground">My Order Timeline</h2>
          </div>
          <div className="p-6 space-y-5">
            {orderRequests.filter((r) => r.status === 'accepted').length === 0 ? (
              <p className="text-muted-foreground italic">No accepted orders yet.</p>
            ) : (
              orderRequests
                .filter((r) => r.status === 'accepted')
                .map((request) => {
                  const order = orders.find((o) => String(o.orderRequestId) === String(request._id));
                  return (
                    <div key={request._id} className="p-5 rounded-2xl border border-border space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-foreground">{request.productId?.title || 'Order'}</p>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                          {order?.status || 'orderPlaced'}
                        </span>
                      </div>
                      <OrderTimeline status={order?.status || 'orderPlaced'} paymentStatus={order?.paymentStatus} />
                    </div>
                  );
                })
            )}
          </div>
        </section>
      </div>

      {/* Rental-based review modal removed (reviews are now orderId-based). */}

      <Footer />
    </main>
  );
}

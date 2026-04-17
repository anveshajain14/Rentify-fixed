'use client';

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fetchMe } from '@/store/slices/authSlice';
import { isAdminRole } from '@/lib/roles';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Users, Package, ShoppingBag, DollarSign, X, Loader2, BarChart3, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState({ summary: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('analytics');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await dispatch(fetchMe()).unwrap();
        if (cancelled) return;
        if (!me || !isAdminRole(me.role)) {
          router.replace(me ? '/' : '/login');
          return;
        }
        const [statsRes, usersRes, prodRes, reportsRes] = await Promise.allSettled([
          api.get('/api/admin/stats'),
          api.get('/api/admin/users'),
          api.get('/api/products?approved=false'),
          api.get('/api/admin/reports'),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users);
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data.products);
        if (reportsRes.status === 'fulfilled') {
          setReports({
            summary: reportsRes.value.data.summary || [],
            reports: reportsRes.value.data.reports || [],
          });
        }
      } catch {
        if (!cancelled) router.replace('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, router]);

  const refreshAdminData = async () => {
    const [statsRes, usersRes, prodRes, reportsRes] = await Promise.allSettled([
      api.get('/api/admin/stats'),
      api.get('/api/admin/users'),
      api.get('/api/products?approved=false'),
      api.get('/api/admin/reports'),
    ]);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats);
    if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users);
    if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data.products);
    if (reportsRes.status === 'fulfilled') {
      setReports({
        summary: reportsRes.value.data.summary || [],
        reports: reportsRes.value.data.reports || [],
      });
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      await api.put(`/api/admin/approve-product/${productId}`);
      toast.success('Product approved');
      await refreshAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleApproveSeller = async (sellerId) => {
    try {
      await api.put(`/api/admin/approve-seller/${sellerId}`);
      toast.success('Seller approved');
      await refreshAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleApproval = async (type, id, isApproved) => {
    try {
      await api.put('/api/admin/approvals', { type, id, isApproved });
      toast.success(`${type} status updated`);
      await refreshAdminData();
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const handleMakeAdmin = async (u) => {
    if (!window.confirm(`Grant admin access to ${u.name}? Seller listings will be hidden while they are an admin.`)) return;
    try {
      await api.put(`/api/admin/make-admin/${u._id}`);
      toast.success('User is now an admin');
      const usersRes = await api.get('/api/admin/users');
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not promote user');
    }
  };

  const handleRemoveAdmin = async (u) => {
    if (!window.confirm(`Remove admin from ${u.name}? They will be restored as ${u.previousRole === 'seller' ? 'a seller' : 'a user'}.`)) return;
    try {
      await api.put(`/api/admin/remove-admin/${u._id}`);
      toast.success('Admin access removed');
      const usersRes = await api.get('/api/admin/users');
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not demote user');
    }
  };

  const handleBlockToggle = async (u) => {
    try {
      const nextBlocked = !u.isBlocked;
      await api.put('/api/admin/users', {
        userId: u._id,
        isApproved: u.isApproved,
        isBlocked: nextBlocked,
        isVerified: u.isVerified,
      });
      toast.success(nextBlocked ? 'User blocked' : 'User unblocked');
      const [usersRes] = await Promise.all([api.get('/api/admin/users')]);
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Unable to update user');
    }
  };

  const handleVerifyToggle = async (u) => {
    try {
      const nextVerified = !u.isVerified;
      await api.put('/api/admin/users', {
        userId: u._id,
        isApproved: u.isApproved,
        isBlocked: u.isBlocked,
        isVerified: nextVerified,
      });
      toast.success(nextVerified ? 'User verified' : 'Verification removed');
      const [usersRes] = await Promise.all([api.get('/api/admin/users')]);
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Unable to update user');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/users?userId=${u._id}`);
      toast.success('User deleted');
      const [usersRes] = await Promise.all([api.get('/api/admin/users')]);
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Unable to delete user');
    }
  };

  // Chart data: empty until backend provides time-series / category aggregates
  const chartData = [];
  const categoryData = [];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-emerald-600 dark:text-cyan-400" size={48} /></div>;
  if (!stats) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Failed to load dashboard data</p></div>;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Platform Control</h1>
          <p className="text-muted-foreground">Monitor activity, approve sellers, and manage marketplace listings.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: <Users className="text-blue-500" />, color: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Total Sellers', value: stats.totalSellers, icon: <ShoppingBag className="text-emerald-500 dark:text-cyan-400" />, color: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Rentals', value: stats.totalRentals, icon: <Package className="text-purple-500" />, color: 'bg-purple-50 dark:bg-purple-900/30' },
            { label: 'Revenue', value: `$${stats.totalEarnings}`, icon: <DollarSign className="text-amber-500" />, color: 'bg-amber-50 dark:bg-amber-900/30' },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-8 rounded-[32px] border border-border shadow-sm dark:shadow-black/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
              <div className={`p-4 ${stat.color} rounded-2xl`}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          {['analytics', 'approvals', 'users', 'reports'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-8 py-3 rounded-2xl text-sm font-bold capitalize transition-all ${tab === t ? 'bg-primary text-primary-foreground shadow-xl' : 'bg-card text-muted-foreground hover:bg-secondary border border-border'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Analytics Content */}
        {tab === 'analytics' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card p-8 rounded-[40px] border border-border shadow-sm dark:shadow-black/20">
              <h3 className="text-lg font-bold mb-8 text-foreground">Weekly Rental Activity</h3>
              <div className="h-80 flex items-center justify-center">
                {chartData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No activity data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} dot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="bg-card p-8 rounded-[40px] border border-border shadow-sm dark:shadow-black/20">
              <h3 className="text-lg font-bold mb-8 text-foreground">Category Performance</h3>
              <div className="h-80 flex items-center justify-center">
                {categoryData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No category data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="value" fill="#000" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approvals Content */}
        {tab === 'approvals' && (
          <div className="space-y-8">
            <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
              <div className="p-8 border-b border-border flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-foreground">Pending Products ({products.filter((p) => !p.isApproved).length})</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approval is global: one admin approval applies for all admins. Approved listings:{' '}
                    {Math.max(0, (stats.totalProducts || 0) - (stats.pendingProducts || 0))}.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {products.filter((p) => !p.isApproved).map((product) => (
                  <div key={product._id} className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={product.images[0]} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                      <div>
                        <h3 className="font-bold text-foreground">{product.title}</h3>
                        <p className="text-xs text-muted-foreground">Seller: {product.seller?.name} • ${product.pricePerDay}/day</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => handleApproveProduct(product._id)} className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">Approve</button>
                      <button type="button" onClick={() => handleApproval('product', product._id, false)} className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all" title="Reject / remove from queue"><X size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
              <div className="p-8 border-b border-border flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-foreground">Pending Sellers ({users.filter((u) => u.role === 'seller' && !u.isApproved).length})</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seller approval is a single shared flag on each seller account (not per admin).
                  </p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {users.filter((u) => u.role === 'seller' && !u.isApproved).map((seller) => (
                  <div key={seller._id} className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground text-2xl">
                        {seller.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{seller.name}</h3>
                        <p className="text-xs text-muted-foreground">{seller.email} • {seller.location || 'Location Not Set'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => handleApproveSeller(seller._id)} className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">Approve</button>
                      <button type="button" onClick={() => handleApproval('seller', seller._id, false)} className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all" title="Revoke approval"><X size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Content */}
        {tab === 'users' && (
          <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
            <div className="p-8 border-b border-border">
              <h2 className="text-xl font-black text-foreground">Platform Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <th className="px-8 py-4">User</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Verified</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Blocked</th>
                    <th className="px-8 py-4">Joined</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-8 py-6 capitalize font-medium">
                        <span>{u.role}</span>
                        {u.role === 'admin' && u.previousRole && (
                          <p className="text-[10px] text-muted-foreground font-normal mt-1 normal-case">
                            Was: {u.previousRole}
                          </p>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.isVerified ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                          {u.isVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {u.role === 'seller' ? (
                          u.isApproved ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                              Approved
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground">Pending</span>
                              <button
                                type="button"
                                onClick={() => handleApproveSeller(u._id)}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                Approve
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.isBlocked ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm text-muted-foreground font-medium">{new Date(u.joinedAt).toLocaleDateString()}</td>
                      <td className="px-8 py-6 text-right space-x-3">
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleMakeAdmin(u)}
                            className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            Make admin
                          </button>
                        )}
                        {u.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(u)}
                            className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            Remove admin
                          </button>
                        )}
                        {!u.isVerified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyToggle(u)}
                            className="text-sm font-bold text-emerald-600 hover:underline"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => handleBlockToggle(u)}
                          className="text-sm font-bold text-red-600 hover:underline"
                        >
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="text-sm font-bold text-gray-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Content */}
        {tab === 'reports' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
              <div className="p-8 border-b border-border flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">Reported Accounts</h2>
                  <p className="text-xs text-muted-foreground">Only visible to admins. Use reports to investigate and, if needed, block users.</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {reports.summary.length === 0 && (
                  <div className="p-8 text-sm text-muted-foreground">
                    No reports yet. When users report accounts, they will appear here.
                  </div>
                )}
                {reports.summary.map((row) => (
                  <div key={row.reportedUserId} className="p-8 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">
                        {row.user?.name || 'User'}{' '}
                        <span className="text-xs text-gray-400 font-medium">({row.user?.email})</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.count} report{row.count !== 1 ? 's' : ''} • Last on{' '}
                        {row.lastReportAt ? new Date(row.lastReportAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                      {row.user?.isBlocked ? 'Blocked' : 'Under review'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50">
                <h2 className="text-xl font-black">Latest Reports</h2>
              </div>
              <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
                {reports.reports.length === 0 && (
                  <div className="p-8 text-sm text-muted-foreground">No individual reports to show.</div>
                )}
                {reports.reports.map((r) => (
                  <div key={r._id} className="p-6 space-y-1">
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      Reporter:{' '}
                      <span className="font-semibold">
                        {r.reporter?.name} ({r.reporter?.email})
                      </span>
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      Reported:{' '}
                      <span className="font-semibold">
                        {r.reportedUser?.name} ({r.reportedUser?.email})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {r.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

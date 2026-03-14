'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, FolderGit2, ShoppingCart, MessageSquare, BarChart3,
  Megaphone, Shield, LogOut, ChevronLeft, ChevronRight, Search,
  Eye, Edit, Trash2, RotateCcw, Check, X, AlertTriangle,
  DollarSign, Star, Menu, Package, Plus, Upload, Image as ImageIcon
} from 'lucide-react';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Tab = 'dashboard' | 'users' | 'projects' | 'orders' | 'comments' | 'announcements' | 'products';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  pendingProjects: number;
  totalOrders: number;
  totalComments: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { user, token, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<{ date: string; amount: number }[]>([]);
  const [activeByDay, setActiveByDay] = useState<{ date: string; count: number }[]>([]);
  const [chartDays, setChartDays] = useState<7 | 30>(30);

  // User management
  const [users, setUsers] = useState<any[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Project management
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsPagination, setProjectsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('');
  const [reviewingProject, setReviewingProject] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectEditForm, setProjectEditForm] = useState<any>({});

  // Order management
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [totalAmount, setTotalAmount] = useState(0);
  const [productOrders, setProductOrders] = useState<any[]>([]);
  const [productOrdersPagination, setProductOrdersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [productOrdersRevenue, setProductOrdersRevenue] = useState(0);
  const [orderSubTab, setOrderSubTab] = useState<'projects' | 'products'>('products');

  // Comment management
  const [comments, setComments] = useState<any[]>([]);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [commentStatusFilter, setCommentStatusFilter] = useState('PENDING');
  const [pendingCommentCount, setPendingCommentCount] = useState(0);

  // Announcement management
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'selected'>('all');
  const [allUsersForAnnouncement, setAllUsersForAnnouncement] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [announcementUserSearch, setAnnouncementUserSearch] = useState('');

  // Product management
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [shopProductsPagination, setShopProductsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [shopProductSearch, setShopProductSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProductShop] = useState<any>(null);
  const [productForm, setProductForm] = useState<any>({
    title: '', slug: '', shortDescription: '', description: '', price: 0, mainImage: '', status: 'ACTIVE',
    images: [] as { url: string }[], variants: [] as { name: string; price: number; stock: number }[],
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchStats();
  }, [_hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    if (!token) return;
    switch (activeTab) {
      case 'users': fetchUsers(); break;
      case 'projects': fetchProjects(); break;
      case 'orders': fetchOrders(); fetchProductOrders(); break;
      case 'comments': fetchComments(); break;
      case 'announcements': fetchAnnouncements(); break;
      case 'products': fetchShopProducts(); break;
    }
  }, [activeTab, token]);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchStats = async (days?: number) => {
    try {
      const d = days ?? chartDays;
      const res = await fetch(`/api/admin/stats?days=${d}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentUsers(data.recentUsers);
        setRecentOrders(data.recentOrders);
        setRevenueByDay(data.revenueByDay || []);
        setActiveByDay(data.activeByDay || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async (page = usersPagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (userSearch) params.set('search', userSearch);
      const res = await fetch(`/api/admin/users?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUsersPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchProjects = async (page = projectsPagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (projectSearch) params.set('search', projectSearch);
      if (projectStatusFilter) params.set('status', projectStatusFilter);
      const res = await fetch(`/api/admin/projects?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setProjectsPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchOrders = async (page = ordersPagination.page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?page=${page}&limit=15`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotalAmount(data.totalAmount);
        setOrdersPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchProductOrders = async (page = productOrdersPagination.page) => {
    try {
      const res = await fetch(`/api/admin/product-orders?page=${page}&limit=15`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProductOrders(data.orders);
        setProductOrdersRevenue(data.totalRevenue);
        setProductOrdersPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
  };

  const fetchComments = async (page = commentsPagination.page, statusOverride?: string) => {
    setLoading(true);
    try {
      const status = statusOverride !== undefined ? statusOverride : commentStatusFilter;
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/comments?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setCommentsPagination(data.pagination);
        setPendingCommentCount(data.pendingCount || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/admin/announcements', { headers });
      if (res.ok) setAnnouncements(await res.json());
    } catch (e) { console.error(e); }
  };

  // User operations
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
        showToast('User info updated', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Update failed', 'error');
      }
    } catch (e) { showToast('Operation failed', 'error'); }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    const confirmed = await showConfirm({ title: 'Confirm', message: `Are you sure you want to delete user "${name}"? This action cannot be undone.`, variant: 'danger' }); if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers });
      if (res.ok) { fetchUsers(); showToast('User deleted', 'success'); }
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  // Project review
  const handleReviewProject = async (projectId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const body: any = { status };
      if (status === 'REJECTED') body.rejectReason = rejectReason;
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH', headers, body: JSON.stringify(body),
      });
      if (res.ok) {
        setReviewingProject(null);
        setRejectReason('');
        fetchProjects();
        fetchStats();
        showToast(`Project ${status === 'APPROVED' ? 'approved' : 'rejected'}`, 'success');
      }
    } catch (e) { showToast('Operation failed', 'error'); }
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    const confirmed = await showConfirm({ title: 'Confirm', message: `Are you sure you want to delete project "${name}"? This action cannot be undone.`, variant: 'danger' }); if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE', headers });
      if (res.ok) { fetchProjects(); showToast('Project deleted', 'success'); }
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    try {
      const res = await fetch(`/api/admin/projects/${editingProject.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(projectEditForm),
      });
      if (res.ok) {
        setEditingProject(null);
        fetchProjects();
        fetchStats();
        showToast('Project updated', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Update failed', 'error');
      }
    } catch (e) { showToast('Operation failed', 'error'); }
  };

  // Comment delete & review
  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await showConfirm({ title: 'Confirm', message: 'Are you sure you want to delete this comment?', variant: 'danger' }); if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE', headers });
      if (res.ok) { fetchComments(); showToast('Comment deleted', 'success'); }
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  const handleReviewComment = async (commentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchComments();
        showToast(`Comment ${status === 'APPROVED' ? 'approved' : 'rejected'}`, 'success');
      }
    } catch (e) { showToast('Operation failed', 'error'); }
  };

  // Announcement operations
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) { showToast('Title and content cannot be empty', 'warning'); return; }
    try {
      const body: any = { ...newAnnouncement };
      if (announcementTarget === 'selected') {
        body.targetUserIds = Array.from(selectedUserIds);
        if (body.targetUserIds.length === 0) { showToast('Please select at least one user', 'warning'); return; }
      }
      const res = await fetch('/api/admin/announcements', {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewAnnouncement(false);
        setNewAnnouncement({ title: '', content: '' });
        setAnnouncementTarget('all');
        setSelectedUserIds(new Set());
        fetchAnnouncements();
        showToast(`Announcement published, notifications sent to ${data.notifiedCount || 'all'} users`, 'success');
      }
    } catch (e) { showToast('Publish failed', 'error'); }
  };

  const fetchUsersForAnnouncement = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=500', { headers });
      if (res.ok) {
        const data = await res.json();
        setAllUsersForAnnouncement(data.users);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const confirmed = await showConfirm({ title: 'Confirm', message: 'Are you sure you want to delete this announcement?', variant: 'danger' }); if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE', headers });
      if (res.ok) fetchAnnouncements();
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  // ===== Shop Product Management =====
  const fetchShopProducts = async (page = shopProductsPagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (shopProductSearch) params.set('search', shopProductSearch);
      const res = await fetch(`/api/admin/products?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setShopProducts(data.products);
        setShopProductsPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleUploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/products/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
      showToast('Upload failed', 'error');
      return null;
    } catch (e) { showToast('Upload failed', 'error'); return null; }
    finally { setUploadingImage(false); }
  };

  const resetProductForm = () => {
    setProductForm({ title: '', slug: '', shortDescription: '', description: '', price: 0, mainImage: '', status: 'ACTIVE', images: [], variants: [] });
    setEditingProductShop(null);
    setShowProductForm(false);
  };

  const openEditProduct = (p: any) => {
    setEditingProductShop(p);
    setProductForm({
      title: p.title, slug: p.slug, shortDescription: p.shortDescription || '', description: p.description || '',
      price: p.price, mainImage: p.mainImage || '', status: p.status,
      images: (p.images || []).map((img: any) => ({ url: img.url })),
      variants: (p.variants || []).map((v: any) => ({ name: v.name, price: v.price, stock: v.stock })),
    });
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.title || !productForm.slug) { showToast('Title and slug are required', 'warning'); return; }
    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(productForm) });
      if (res.ok) {
        resetProductForm();
        fetchShopProducts();
        showToast(editingProduct ? 'Product updated' : 'Product created', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (e) { showToast('Operation failed', 'error'); }
  };

  const handleDeleteShopProduct = async (id: string, title: string) => {
    const confirmed = await showConfirm({ title: 'Confirm', message: `Are you sure you want to delete product "${title}"?`, variant: 'danger' }); if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers });
      if (res.ok) { fetchShopProducts(); showToast('Product deleted', 'success'); }
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  const handleToggleProductStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch(`/api/admin/products/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) fetchShopProducts();
    } catch (e) { showToast('Operation failed', 'error'); }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-US');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Overview', icon: BarChart3 },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'projects', label: 'Project Management', icon: FolderGit2 },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'orders', label: 'Order Management', icon: ShoppingCart },
    { key: 'comments', label: 'Comment Management', icon: MessageSquare },
    { key: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  if (!_hasHydrated || !isAuthenticated || user?.role !== 'ADMIN') return null;

  const Pagination = ({ p, onPageChange }: { p: any; onPageChange: (page: number) => void }) => (
    p.totalPages > 1 ? (
      <div className="flex items-center justify-center gap-4 mt-6">
        <button onClick={() => onPageChange(p.page - 1)} disabled={p.page <= 1}
          className="px-3 py-1 border-2 border-foreground text-sm disabled:opacity-30 hover:bg-foreground hover:text-background transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="font-mono text-sm">{p.page} / {p.totalPages} ({p.total} total)</span>
        <button onClick={() => onPageChange(p.page + 1)} disabled={p.page >= p.totalPages}
          className="px-3 py-1 border-2 border-foreground text-sm disabled:opacity-30 hover:bg-foreground hover:text-background transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen texture-lines flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b-4 border-foreground bg-background px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Shield size={14} />
          <Link href="/dashboard" className="font-display text-lg tracking-tight">CodeHost</Link>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted transition-colors">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 border-r-4 border-foreground min-h-screen flex flex-col bg-background transform transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b-4 border-foreground">
          <Link href="/dashboard" className="font-display text-xl tracking-tight">CodeHost</Link>
          <div className="flex items-center gap-2 mt-2">
            <Shield size={14} />
            <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setActiveTab(key); setSidebarOpen(false); }}
              className={`w-full px-6 py-3 flex items-center gap-3 text-sm transition-colors ${
                activeTab === key ? 'bg-foreground text-background font-semibold' : 'hover:bg-muted'
              }`}>
              <Icon size={18} />
              {label}
              {key === 'projects' && stats?.pendingProjects ? (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pendingProjects}</span>
              ) : null}
              {key === 'comments' && pendingCommentCount > 0 ? (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCommentCount}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t-2 border-foreground">
          <button onClick={() => { logout(); router.push('/'); }}
            className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-muted transition-colors">
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto min-w-0">
        {/* Overview */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="font-display text-2xl md:text-3xl mb-6 md:mb-8">Admin Overview</h1>
            {stats && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users },
                    { label: 'Total Projects', value: stats.totalProjects, icon: FolderGit2 },
                    { label: 'Pending', value: stats.pendingProjects, icon: AlertTriangle },
                    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart },
                    { label: 'Total Comments', value: stats.totalComments, icon: MessageSquare },
                    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="border-4 border-foreground p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} className="text-muted-foreground" />
                        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
                      </div>
                      <span className="font-display text-2xl">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  {/* Revenue chart - Line chart */}
                  <div className="border-4 border-foreground p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg flex items-center gap-2">
                        <DollarSign size={18} /> Revenue Trend
                      </h3>
                      <div className="flex border-2 border-foreground text-xs font-mono">
                        <button onClick={() => { setChartDays(7); fetchStats(7); }}
                          className={`px-2.5 py-1 transition-colors ${chartDays === 7 ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>7D</button>
                        <button onClick={() => { setChartDays(30); fetchStats(30); }}
                          className={`px-2.5 py-1 border-l-2 border-foreground transition-colors ${chartDays === 30 ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>30D</button>
                      </div>
                    </div>
                    {revenueByDay.length > 0 ? (() => {
                      const maxAmount = Math.max(...revenueByDay.map(r => r.amount), 1);
                      const chartH = 120;
                      const chartW = revenueByDay.length > 1 ? revenueByDay.length - 1 : 1;
                      const points = revenueByDay.map((item, i) => {
                        const x = (i / chartW) * 100;
                        const y = chartH - (item.amount / maxAmount) * chartH;
                        return { x, y, ...item };
                      });
                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                      const areaPath = linePath + ` L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`;
                      // Calculate label interval
                      const labelInterval = chartDays <= 7 ? 1 : 5;
                      return (
                        <div className="relative h-44 pb-5">
                          <svg viewBox={`-2 -10 104 ${chartH + 20}`} className="w-full h-full" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
                              </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#revGrad)" />
                            <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                            {points.map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="2" fill="currentColor" vectorEffect="non-scaling-stroke" className="opacity-0 hover:opacity-100" />
                            ))}
                          </svg>
                          {/* X-axis labels */}
                          <div className="absolute bottom-0 left-0 right-0 flex">
                            {revenueByDay.map((item, i) => (
                              <div key={i} className="flex-1 text-center">
                                {i % labelInterval === 0 && (
                                  <span className="text-[8px] font-mono text-muted-foreground">{item.date}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Hover tooltip layer */}
                          <div className="absolute inset-0 bottom-5 flex">
                            {revenueByDay.map((item, i) => (
                              <div key={i} className="flex-1 group relative">
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                  {item.date}: ${item.amount.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                    )}
                  </div>

                  {/* Active users chart - bar chart */}
                  <div className="border-4 border-foreground p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg flex items-center gap-2">
                        <Users size={18} /> Active Users Trend
                      </h3>
                      <div className="flex border-2 border-foreground text-xs font-mono">
                        <button onClick={() => { setChartDays(7); fetchStats(7); }}
                          className={`px-2.5 py-1 transition-colors ${chartDays === 7 ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>7D</button>
                        <button onClick={() => { setChartDays(30); fetchStats(30); }}
                          className={`px-2.5 py-1 border-l-2 border-foreground transition-colors ${chartDays === 30 ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>30D</button>
                      </div>
                    </div>
                    {activeByDay.length > 0 ? (() => {
                      const maxCount = Math.max(...activeByDay.map(d => d.count), 1);
                      const labelInterval = chartDays <= 7 ? 1 : 5;
                      return (
                        <div className="flex items-end gap-[2px] h-40 pb-5 relative">
                          {activeByDay.map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              <div
                                className="w-full bg-foreground/80 transition-all duration-300 min-h-[2px] hover:bg-foreground"
                                style={{ height: `${Math.max((item.count / maxCount) * 100, 2)}px` }}
                              />
                              {i % labelInterval === 0 && (
                                <span className="text-[8px] font-mono text-muted-foreground mt-1 absolute -bottom-4">{item.date}</span>
                              )}
                              <div className="absolute bottom-full mb-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                {item.date}: {item.count} users
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })() : (
                      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                    )}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="border-4 border-foreground p-6">
                    <h3 className="font-display text-lg mb-4">Recently Registered Users</h3>
                    {recentUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                        <div>
                          <span className="font-medium">{u.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-4 border-foreground p-6">
                    <h3 className="font-display text-lg mb-4">Recent Transactions</h3>
                    {recentOrders.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No transaction records</p>
                    ) : recentOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                        <div>
                          <span className="text-sm">{o.buyer.name} purchased {o.project.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm">${o.amount.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground block">{formatDate(o.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* User management */}
        {activeTab === 'users' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h1 className="font-display text-2xl md:text-3xl">User Management</h1>
              <div className="flex gap-2">
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
                  placeholder="Search username or email..."
                  className="border-2 border-foreground px-3 py-1.5 text-sm flex-1 md:w-64 focus:outline-none" />
                <button onClick={() => fetchUsers(1)}
                  className="border-2 border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors">
                  <Search size={16} />
                </button>
              </div>
            </div>

            <div className="border-4 border-foreground overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-foreground text-background">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Role</th>
                    <th className="text-right px-4 py-3">Balance</th>
                    <th className="text-right px-4 py-3 whitespace-nowrap">Projects</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Registered</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-muted hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.avatar ? (
                            <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 bg-muted flex items-center justify-center text-xs font-bold rounded-full">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 border whitespace-nowrap ${u.role === 'ADMIN' ? 'bg-foreground text-background' : 'border-foreground'}`}>
                          {u.role === 'ADMIN' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">${u.balance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{u._count.ownedProjects}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingUser(u); setEditForm({ name: u.name, email: u.email, balance: u.balance, role: u.role, resetPassword: '' }); }}
                            className="p-1.5 hover:bg-muted transition-colors" title="Edit">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination p={usersPagination} onPageChange={(p) => { setUsersPagination(prev => ({ ...prev, page: p })); fetchUsers(p); }} />

            {/* Edit user dialog */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background border-4 border-foreground p-6 w-full max-w-md shadow-brutal">
                  <h3 className="font-display text-xl mb-4">Edit User: {editingUser.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Username</label>
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Email</label>
                      <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Balance</label>
                      <input type="number" step="0.01" value={editForm.balance} onChange={e => setEditForm({ ...editForm, balance: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Role</label>
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none bg-background">
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Reset Password (leave blank to keep)</label>
                      <input type="password" value={editForm.resetPassword || ''} onChange={e => setEditForm({ ...editForm, resetPassword: e.target.value })}
                        placeholder="Enter new password..."
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={handleUpdateUser}
                      className="flex-1 bg-foreground text-background py-2 text-sm font-semibold hover:opacity-90 transition-colors">
                      Save Changes
                    </button>
                    <button onClick={() => setEditingUser(null)}
                      className="flex-1 border-2 border-foreground py-2 text-sm hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Project management */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h1 className="font-display text-2xl md:text-3xl">Project Management</h1>
              <div className="flex flex-wrap gap-2">
                <select value={projectStatusFilter} onChange={e => { setProjectStatusFilter(e.target.value); setTimeout(() => fetchProjects(1), 0); }}
                  className="border-2 border-foreground px-3 py-1.5 text-sm bg-background focus:outline-none">
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchProjects(1)}
                  placeholder="Search project name..."
                  className="border-2 border-foreground px-3 py-1.5 text-sm flex-1 md:w-52 focus:outline-none" />
                <button onClick={() => fetchProjects(1)}
                  className="border-2 border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors">
                  <Search size={16} />
                </button>
              </div>
            </div>

            <div className="border-4 border-foreground overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-foreground text-background">
                    <th className="text-left px-4 py-3">Project Name</th>
                    <th className="text-left px-4 py-3">Owner</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="text-center px-4 py-3 whitespace-nowrap">Visibility</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-center px-4 py-3">Stars</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Created</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id} className="border-b border-muted hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{p.name}</span>
                          {p.language && <span className="text-xs text-muted-foreground ml-2 border px-1">{p.language}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{p.slug}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.owner.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 border whitespace-nowrap ${
                          p.status === 'APPROVED' ? 'bg-green-100 border-green-600 text-green-700' :
                          p.status === 'PENDING' ? 'bg-yellow-100 border-yellow-600 text-yellow-700' :
                          'bg-red-100 border-red-600 text-red-700'
                        }`}>
                          {p.status === 'APPROVED' ? 'Approved' : p.status === 'PENDING' ? 'Pending' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{p.isPrivate ? 'Private' : 'Public'}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.price > 0 ? `$${p.price.toFixed(2)}` : 'Free'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Star size={12} /> {p._count.stars}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => {
                            setEditingProject(p);
                            setProjectEditForm({ status: p.status, isPrivate: p.isPrivate, price: p.price, name: p.name, description: p.description || '' });
                          }}
                            className="p-1.5 hover:bg-muted transition-colors" title="Edit">
                            <Edit size={14} />
                          </button>
                          {p.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleReviewProject(p.id, 'APPROVED')}
                                className="p-1.5 hover:bg-green-100 text-green-600 transition-colors" title="Approve">
                                <Check size={14} />
                              </button>
                              <button onClick={() => { setReviewingProject(p); setRejectReason(''); }}
                                className="p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Reject">
                                <X size={14} />
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDeleteProject(p.id, p.name)}
                            className="p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination p={projectsPagination} onPageChange={(p) => fetchProjects(p)} />

            {/* Reject reason dialog */}
            {reviewingProject && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background border-4 border-foreground p-6 w-full max-w-md shadow-brutal">
                  <h3 className="font-display text-xl mb-4">Reject Project: {reviewingProject.name}</h3>
                  <div className="mb-4">
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Rejection Reason</label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      rows={3} placeholder="Enter rejection reason..."
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleReviewProject(reviewingProject.id, 'REJECTED')}
                      className="flex-1 bg-red-600 text-white py-2 text-sm font-semibold hover:opacity-90">
                      Confirm Rejection
                    </button>
                    <button onClick={() => setReviewingProject(null)}
                      className="flex-1 border-2 border-foreground py-2 text-sm hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit project dialog */}
            {editingProject && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background border-4 border-foreground p-6 w-full max-w-md shadow-brutal">
                  <h3 className="font-display text-xl mb-4">Edit Project: {editingProject.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Project Name</label>
                      <input value={projectEditForm.name} onChange={e => setProjectEditForm({ ...projectEditForm, name: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Description</label>
                      <textarea value={projectEditForm.description} onChange={e => setProjectEditForm({ ...projectEditForm, description: e.target.value })}
                        rows={3} className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Review Status</label>
                      <select value={projectEditForm.status} onChange={e => setProjectEditForm({ ...projectEditForm, status: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none bg-background">
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Visibility</label>
                      <select value={projectEditForm.isPrivate ? 'private' : 'public'} onChange={e => setProjectEditForm({ ...projectEditForm, isPrivate: e.target.value === 'private' })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none bg-background">
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest mb-1">Price ($)</label>
                      <input type="number" step="0.01" min="0" value={projectEditForm.price} onChange={e => setProjectEditForm({ ...projectEditForm, price: e.target.value })}
                        className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={handleUpdateProject}
                      className="flex-1 bg-foreground text-background py-2 text-sm font-semibold hover:opacity-90 transition-colors">
                      Save Changes
                    </button>
                    <button onClick={() => setEditingProject(null)}
                      className="flex-1 border-2 border-foreground py-2 text-sm hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order management */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h1 className="font-display text-2xl md:text-3xl">Order Management</h1>
              <div className="flex gap-4">
                <div className="border-4 border-foreground px-4 py-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Project Revenue: </span>
                  <span className="font-display text-xl">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="border-4 border-foreground px-4 py-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Product Revenue: </span>
                  <span className="font-display text-xl">${productOrdersRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-0 mb-6 border-4 border-foreground w-fit">
              <button onClick={() => setOrderSubTab('products')}
                className={`px-6 py-2 text-sm font-mono transition-colors ${orderSubTab === 'products' ? 'bg-foreground text-background font-bold' : 'hover:bg-muted'}`}>
                Product Orders ({productOrdersPagination.total})
              </button>
              <button onClick={() => setOrderSubTab('projects')}
                className={`px-6 py-2 text-sm font-mono transition-colors ${orderSubTab === 'projects' ? 'bg-foreground text-background font-bold' : 'hover:bg-muted'}`}>
                Project Orders ({ordersPagination.total})
              </button>
            </div>

            {/* Product orders table */}
            {orderSubTab === 'products' && (
              <>
                <div className="border-4 border-foreground overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-foreground text-background">
                        <th className="text-left px-4 py-3">Order No</th>
                        <th className="text-left px-4 py-3">Buyer</th>
                        <th className="text-left px-4 py-3">Items</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Amount</th>
                        <th className="text-left px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productOrders.map(o => (
                        <tr key={o.id} className="border-b border-muted hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">{o.orderNo}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {o.user.avatar ? (
                                <img src={o.user.avatar} className="w-6 h-6 rounded-full" alt="" />
                              ) : (
                                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-[10px]">{o.user.name.slice(0, 1)}</div>
                              )}
                              <div>
                                <span className="block">{o.user.name}</span>
                                <span className="text-xs text-muted-foreground">{o.user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {o.items.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  {item.product.mainImage && <img src={item.product.mainImage} className="w-8 h-8 object-cover border" alt="" />}
                                  <div className="text-xs">
                                    <span className="font-medium">{item.product.title}</span>
                                    {item.variant && <span className="text-muted-foreground"> ({item.variant.name})</span>}
                                    <span className="text-muted-foreground"> × {item.quantity}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono px-2 py-0.5 border ${
                              o.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-300' :
                              o.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                              'bg-red-100 text-red-700 border-red-300'
                            }`}>{o.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">${o.totalAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(o.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination p={productOrdersPagination} onPageChange={(p) => fetchProductOrders(p)} />
              </>
            )}

            {/* Project orders table */}
            {orderSubTab === 'projects' && (
              <>
              <div className="border-4 border-foreground overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground text-background">
                    <th className="text-left px-4 py-3">Order ID</th>
                    <th className="text-left px-4 py-3">Buyer</th>
                    <th className="text-left px-4 py-3">Project</th>
                    <th className="text-left px-4 py-3">Seller</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-muted hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {o.buyer.avatar ? (
                            <img src={o.buyer.avatar} className="w-6 h-6 rounded-full" alt="" />
                          ) : (
                            <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-[10px]">{o.buyer.name.slice(0, 1)}</div>
                          )}
                          <span>{o.buyer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{o.project.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.project.owner.name}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">${o.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination p={ordersPagination} onPageChange={(p) => fetchOrders(p)} />
              </>
            )}
          </div>
        )}

        {/* Comment management */}
        {activeTab === 'comments' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h1 className="font-display text-2xl md:text-3xl">Comment Management</h1>
              <div className="flex gap-2">
                <select value={commentStatusFilter} onChange={e => { const val = e.target.value; setCommentStatusFilter(val); fetchComments(1, val); }}
                  className="border-2 border-foreground px-3 py-1.5 text-sm bg-background focus:outline-none">
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="border-4 border-foreground p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        <span className="font-medium">{c.author.name}</span>
                        <span className="text-xs text-muted-foreground hidden md:inline">{c.author.email}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <Link href={`/project/${c.project.slug}`} className="text-xs font-medium hover:underline">{c.project.name}</Link>
                        {c.parentId && <span className="text-xs border px-1 text-muted-foreground">Reply</span>}
                        <span className={`text-xs px-2 py-0.5 border ${
                          c.status === 'APPROVED' ? 'bg-green-100 border-green-600 text-green-700' :
                          c.status === 'PENDING' ? 'bg-yellow-100 border-yellow-600 text-yellow-700' :
                          'bg-red-100 border-red-600 text-red-700'
                        }`}>
                          {c.status === 'APPROVED' ? 'Approved' : c.status === 'PENDING' ? 'Pending' : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-sm">{c.content}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      {c.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleReviewComment(c.id, 'APPROVED')}
                            className="p-1.5 hover:bg-green-100 text-green-600 transition-colors" title="Approve">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleReviewComment(c.id, 'REJECTED')}
                            className="p-1.5 hover:bg-orange-100 text-orange-600 transition-colors" title="Reject">
                            <X size={16} />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteComment(c.id)}
                        className="p-2 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-muted">
                  <MessageSquare size={32} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No comments</p>
                </div>
              )}
            </div>
            <Pagination p={commentsPagination} onPageChange={(p) => fetchComments(p)} />
          </div>
        )}

        {/* Announcements */}
        {activeTab === 'announcements' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h1 className="font-display text-2xl md:text-3xl">Announcements</h1>
              <button onClick={() => { setShowNewAnnouncement(true); fetchUsersForAnnouncement(); }}
                className="bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-colors">
                <Megaphone size={16} className="inline mr-2" />
                New Announcement
              </button>
            </div>

            {showNewAnnouncement && (
              <div className="border-4 border-foreground p-6 mb-6 bg-muted/30">
                <h3 className="font-display text-lg mb-4">New Announcement</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Title</label>
                    <input value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      placeholder="Announcement title..."
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Content</label>
                    <textarea value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                      rows={4} placeholder="Announcement content..."
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-2">Recipients</label>
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="target" checked={announcementTarget === 'all'} onChange={() => setAnnouncementTarget('all')} className="w-4 h-4" />
                        <span className="text-sm">All Users</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="target" checked={announcementTarget === 'selected'} onChange={() => setAnnouncementTarget('selected')} className="w-4 h-4" />
                        <span className="text-sm">Selected Users</span>
                      </label>
                    </div>
                    {announcementTarget === 'selected' && (
                      <div className="border-2 border-foreground p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input value={announcementUserSearch} onChange={e => setAnnouncementUserSearch(e.target.value)}
                            placeholder="Search username or email..."
                            className="flex-1 border border-foreground px-2 py-1 text-sm focus:outline-none" />
                          <button onClick={() => {
                            if (selectedUserIds.size === allUsersForAnnouncement.length) {
                              setSelectedUserIds(new Set());
                            } else {
                              setSelectedUserIds(new Set(allUsersForAnnouncement.map(u => u.id)));
                            }
                          }}
                            className="border border-foreground px-2 py-1 text-xs hover:bg-foreground hover:text-background transition-colors whitespace-nowrap">
                            {selectedUserIds.size === allUsersForAnnouncement.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {allUsersForAnnouncement
                            .filter(u => !announcementUserSearch || u.name.toLowerCase().includes(announcementUserSearch.toLowerCase()) || u.email.toLowerCase().includes(announcementUserSearch.toLowerCase()))
                            .map(u => (
                            <label key={u.id} className="flex items-center gap-2 py-1 px-1 hover:bg-muted cursor-pointer text-sm">
                              <input type="checkbox" className="w-3.5 h-3.5"
                                checked={selectedUserIds.has(u.id)}
                                onChange={e => {
                                  const next = new Set(selectedUserIds);
                                  if (e.target.checked) next.add(u.id); else next.delete(u.id);
                                  setSelectedUserIds(next);
                                }} />
                              <span className="font-medium">{u.name}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </label>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Selected: {selectedUserIds.size} / {allUsersForAnnouncement.length} users
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCreateAnnouncement}
                      className="bg-foreground text-background px-6 py-2 text-sm font-semibold hover:opacity-90">
                      {announcementTarget === 'all' ? 'Publish & Notify All Users' : `Publish & Notify ${selectedUserIds.size} Users`}
                    </button>
                    <button onClick={() => { setShowNewAnnouncement(false); setAnnouncementTarget('all'); setSelectedUserIds(new Set()); }}
                      className="border-2 border-foreground px-6 py-2 text-sm hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="border-4 border-foreground p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display text-lg">{a.title}</h4>
                      <p className="text-sm mt-1">{a.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                        <span className={`text-xs px-2 py-0.5 border ${a.isActive ? 'border-green-600 text-green-700' : 'border-muted-foreground text-muted-foreground'}`}>
                          {a.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAnnouncement(a.id)}
                      className="p-2 hover:bg-red-100 text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-muted">
                  <Megaphone size={32} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No announcements</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Management */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <h1 className="font-display text-2xl md:text-3xl">Products</h1>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={shopProductSearch} onChange={e => setShopProductSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchShopProducts(1)}
                    placeholder="Search products..."
                    className="border-2 border-foreground pl-9 pr-3 py-1.5 text-sm w-48 focus:outline-none" />
                </div>
                <button onClick={() => { resetProductForm(); setShowProductForm(true); }}
                  className="bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-colors flex items-center gap-2">
                  <Plus size={16} /> New Product
                </button>
              </div>
            </div>

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="border-4 border-foreground p-6 mb-6 bg-muted/30">
                <h3 className="font-display text-lg mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Title *</label>
                    <input value={productForm.title} onChange={e => {
                      const title = e.target.value;
                      setProductForm((f: any) => ({ ...f, title, slug: editingProduct ? f.slug : generateSlug(title) }));
                    }}
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Slug *</label>
                    <input value={productForm.slug} onChange={e => setProductForm((f: any) => ({ ...f, slug: e.target.value }))}
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Price ($)</label>
                    <input type="number" step="0.01" min="0" value={productForm.price} onChange={e => setProductForm((f: any) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Status</label>
                    <select value={productForm.status} onChange={e => setProductForm((f: any) => ({ ...f, status: e.target.value }))}
                      className="w-full border-2 border-foreground px-3 py-2 text-sm bg-background focus:outline-none">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Short Description</label>
                    <input value={productForm.shortDescription} onChange={e => setProductForm((f: any) => ({ ...f, shortDescription: e.target.value }))}
                      maxLength={500}
                      className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Description</label>
                    <textarea value={productForm.description} onChange={e => setProductForm((f: any) => ({ ...f, description: e.target.value }))}
                      rows={4} className="w-full border-2 border-foreground px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>

                  {/* Main Image */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Main Image</label>
                    <div className="flex items-center gap-4">
                      {productForm.mainImage && (
                        <img src={productForm.mainImage} alt="Main" className="w-24 h-24 object-cover border-2 border-foreground" />
                      )}
                      <label className="cursor-pointer border-2 border-dashed border-foreground px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                        <Upload size={16} />
                        {uploadingImage ? 'Uploading...' : 'Upload Main Image'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await handleUploadImage(file);
                            if (url) setProductForm((f: any) => ({ ...f, mainImage: url }));
                            e.target.value = '';
                          }} />
                      </label>
                    </div>
                  </div>

                  {/* Additional Images */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Additional Images (max 6)</label>
                    <div className="flex flex-wrap gap-3 mb-2">
                      {productForm.images.map((img: { url: string }, i: number) => (
                        <div key={i} className="relative">
                          <img src={img.url} alt="" className="w-20 h-20 object-cover border-2 border-foreground" />
                          <button onClick={() => setProductForm((f: any) => ({ ...f, images: f.images.filter((_: any, idx: number) => idx !== i) }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">×</button>
                        </div>
                      ))}
                    </div>
                    {productForm.images.length < 6 && (
                      <label className="cursor-pointer border-2 border-dashed border-foreground px-4 py-2 text-sm hover:bg-muted transition-colors inline-flex items-center gap-2">
                        <ImageIcon size={16} />
                        {uploadingImage ? 'Uploading...' : 'Add Image'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await handleUploadImage(file);
                            if (url) setProductForm((f: any) => ({ ...f, images: [...f.images, { url }] }));
                            e.target.value = '';
                          }} />
                      </label>
                    )}
                  </div>

                  {/* Variants */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1">Variants</label>
                    <div className="space-y-2 mb-2">
                      {productForm.variants.map((v: { name: string; price: number; stock: number }, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={v.name} placeholder="Variant name"
                            onChange={e => { const vs = [...productForm.variants]; vs[i] = { ...vs[i], name: e.target.value }; setProductForm((f: any) => ({ ...f, variants: vs })); }}
                            className="flex-1 border-2 border-foreground px-3 py-1.5 text-sm focus:outline-none" />
                          <input type="number" step="0.01" min="0" value={v.price} placeholder="Price"
                            onChange={e => { const vs = [...productForm.variants]; vs[i] = { ...vs[i], price: parseFloat(e.target.value) || 0 }; setProductForm((f: any) => ({ ...f, variants: vs })); }}
                            className="w-28 border-2 border-foreground px-3 py-1.5 text-sm focus:outline-none" />
                          <input type="number" min="-1" value={v.stock} placeholder="Stock"
                            onChange={e => { const vs = [...productForm.variants]; vs[i] = { ...vs[i], stock: parseInt(e.target.value) || -1 }; setProductForm((f: any) => ({ ...f, variants: vs })); }}
                            className="w-24 border-2 border-foreground px-3 py-1.5 text-sm focus:outline-none" />
                          <button onClick={() => setProductForm((f: any) => ({ ...f, variants: f.variants.filter((_: any, idx: number) => idx !== i) }))}
                            className="p-1.5 hover:bg-red-100 text-red-600 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setProductForm((f: any) => ({ ...f, variants: [...f.variants, { name: '', price: 0, stock: -1 }] }))}
                      className="border-2 border-foreground px-3 py-1.5 text-sm hover:bg-foreground hover:text-background transition-colors flex items-center gap-1">
                      <Plus size={14} /> Add Variant
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSaveProduct}
                    className="bg-foreground text-background px-6 py-2 text-sm font-semibold hover:opacity-90">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button onClick={resetProductForm}
                    className="border-2 border-foreground px-6 py-2 text-sm hover:bg-muted">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Products Table */}
            <div className="border-4 border-foreground overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground bg-muted/50">
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest">Image</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest">Title</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest">Price</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest">Variants</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest">Status</th>
                    <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest">Created</th>
                    <th className="text-right px-4 py-3 font-mono text-xs uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {shopProducts.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        {p.mainImage ? (
                          <img src={p.mainImage} alt="" className="w-12 h-12 object-cover border border-foreground" />
                        ) : (
                          <div className="w-12 h-12 bg-muted flex items-center justify-center border border-foreground">
                            <Package size={18} className="text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{p.slug}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs">{p.variants?.length || 0} variants</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 border ${p.status === 'ACTIVE' ? 'border-green-600 text-green-700 bg-green-50' : 'border-muted-foreground text-muted-foreground'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleToggleProductStatus(p.id, p.status)}
                            className="p-1.5 hover:bg-muted transition-colors" title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                            {p.status === 'ACTIVE' ? <X size={16} /> : <Check size={16} />}
                          </button>
                          <button onClick={() => openEditProduct(p)}
                            className="p-1.5 hover:bg-muted transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteShopProduct(p.id, p.title)}
                            className="p-1.5 hover:bg-red-100 text-red-600 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shopProducts.length === 0 && !loading && (
              <div className="text-center py-12 border-2 border-dashed border-muted mt-4">
                <Package size={32} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No products yet</p>
              </div>
            )}
            <Pagination p={shopProductsPagination} onPageChange={(p) => fetchShopProducts(p)} />
          </div>
        )}
      </main>
    </div>
  );
}

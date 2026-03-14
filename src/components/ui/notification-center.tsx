'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Check, X, UserPlus, ShoppingCart, Megaphone, AlertCircle, CheckCheck } from 'lucide-react';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui/toast';

interface Invitation {
  id: string;
  role: string;
  message?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

type ActiveTab = 'all' | 'invitations' | 'orders' | 'system';

export function NotificationCenter() {
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [loading, setLoading] = useState(false);

  const totalCount = invitations.length + unreadCount;

  const fetchData = async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    try {
      const [invRes, notifRes] = await Promise.all([
        fetch('/api/invitations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/notifications?limit=30', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (invRes.ok) {
        const data = await invRes.json();
        setInvitations(Array.isArray(data) ? data : []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to get notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        if (action === 'accept' && data.projectSlug) {
          setIsOpen(false);
          router.push(`/project/${data.projectSlug}`);
        } else {
          fetchData();
        }
      } else {
        const error = await res.json();
        showToast(error.error || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Failed to process invitation:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAll: true }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notificationId: notif.id }),
        });
      } catch (e) {}
    }

    if (notif.link) {
      setIsOpen(false);
      router.push(notif.link);
    }

    fetchData();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ORDER_BOUGHT':
      case 'ORDER_SOLD':
        return <ShoppingCart size={14} className="text-green-600" />;
      case 'SYSTEM':
        return <Megaphone size={14} className="text-blue-600" />;
      case 'REVIEW':
        return <AlertCircle size={14} className="text-yellow-600" />;
      default:
        return <Bell size={14} />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'orders') return n.type === 'ORDER_BOUGHT' || n.type === 'ORDER_SOLD';
    if (activeTab === 'system') return n.type === 'SYSTEM' || n.type === 'REVIEW';
    return true;
  });

  const getRoleText = (role: string) => {
    switch (role) {
      case 'EDITOR': return 'Editor';
      default: return 'Viewer';
    }
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} strokeWidth={1.5} />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed md:absolute left-0 md:left-auto right-0 top-[60px] md:top-full md:mt-2 w-full md:w-96 bg-background border-4 border-foreground shadow-brutal z-50 max-h-[calc(100vh-70px)] md:max-h-[unset] flex flex-col">
            {/* Tabs */}
            <div className="flex border-b-2 border-foreground">
              {[
                { key: 'all' as ActiveTab, label: 'All' },
                { key: 'invitations' as ActiveTab, label: `Invitations${invitations.length ? ` (${invitations.length})` : ''}` },
                { key: 'orders' as ActiveTab, label: 'Transactions' },
                { key: 'system' as ActiveTab, label: 'System' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                    activeTab === tab.key ? 'bg-foreground text-background font-bold' : 'hover:bg-muted'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mark all read button */}
            {unreadCount > 0 && activeTab !== 'invitations' && (
              <div className="px-3 py-2 border-b border-muted flex justify-end">
                <button onClick={handleMarkAllRead} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <CheckCheck size={12} /> Mark All Read
                </button>
              </div>
            )}

            <div className="max-h-[calc(100vh-160px)] md:max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
              ) : (
                <>
                  {/* Invitation list */}
                  {(activeTab === 'all' || activeTab === 'invitations') && invitations.map(inv => (
                    <div key={`inv-${inv.id}`} className="p-4 border-b border-muted bg-yellow-50/50">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {inv.sender.avatar && <AvatarImage src={inv.sender.avatar} alt={inv.sender.name} />}
                          <AvatarFallback className="text-xs">{inv.sender.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <UserPlus size={12} className="inline mr-1" />
                            <span className="font-medium">{inv.sender.name}</span>
                            {' invites you to join '}
                            <span className="font-medium">{inv.project.name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Role: {getRoleText(inv.role)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleInvitationAction(inv.id, 'accept')}>
                          <Check size={12} className="mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handleInvitationAction(inv.id, 'reject')}>
                          <X size={12} className="mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Notification list */}
                  {activeTab !== 'invitations' && filteredNotifications.map(notif => (
                    <div key={`notif-${notif.id}`}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 border-b border-muted cursor-pointer hover:bg-muted/50 transition-colors ${!notif.isRead ? 'bg-blue-50/50' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {notif.title}
                            {!notif.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notif.createdAt).toLocaleString('en-US')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty state */}
                  {activeTab === 'invitations' && invitations.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      <UserPlus size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No invitations</p>
                    </div>
                  )}
                  {activeTab !== 'invitations' && filteredNotifications.length === 0 && invitations.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

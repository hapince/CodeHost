'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Check, X, UserPlus } from 'lucide-react';
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
    description?: string;
  };
}

export function InvitationDropdown() {
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInvitations = async () => {
    if (!isAuthenticated || !token) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/invitations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to get invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const handleAction = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        if (action === 'accept' && data.projectSlug) {
          setIsOpen(false);
          router.push(`/project/${data.projectSlug}`);
        } else {
          fetchInvitations();
        }
      } else {
        const error = await res.json();
        showToast(error.error || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Failed to process invitation:', error);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'EDITOR':
        return 'Editor';
      default:
        return 'Viewer';
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
        {invitations.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {invitations.length > 9 ? '9+' : invitations.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Background overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-background border-4 border-foreground shadow-brutal z-50">
            <div className="p-3 border-b-2 border-foreground flex items-center justify-between">
              <h3 className="font-display text-lg flex items-center gap-2">
                <UserPlus size={18} />
                Project Invitations
              </h3>
              <span className="text-sm text-muted-foreground">
                {invitations.length} pending
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No invitations</p>
                </div>
              ) : (
                invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 border-b border-muted last:border-b-0"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        {inv.sender.avatar && <AvatarImage src={inv.sender.avatar} alt={inv.sender.name} />}
                        <AvatarFallback className="text-sm">
                          {inv.sender.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{inv.sender.name}</span>
                          {' invites you to join '}
                          <span className="font-medium">{inv.project.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Role: {getRoleText(inv.role)}
                        </p>
                        {inv.message && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            "{inv.message}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAction(inv.id, 'accept')}
                      >
                        <Check size={14} className="mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleAction(inv.id, 'reject')}
                      >
                        <X size={14} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

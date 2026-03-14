'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Search,
  UserPlus,
  Crown,
  Shield,
  Eye,
  X,
  Clock,
  Check,
  Trash2,
} from 'lucide-react';
import { Button, Input, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Invitation {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  receiver: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  sender: {
    id: string;
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

export default function MembersPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, user: currentUser, _hasHydrated } = useAuthStore();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search related state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProject();
  }, [_hasHydrated, isAuthenticated, params.slug]);

  useEffect(() => {
    if (project?.id) {
      fetchMembers();
      fetchInvitations();
    }
  }, [project?.id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/by-slug/${params.slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Failed to get project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to get members:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to get invitations:', error);
    }
  };

  // Debounced search
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !project?.id) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}&projectId=${project.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  }, [token, project?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleInvite = async () => {
    if (!selectedUser || !project?.id) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          role: selectedRole,
          message: inviteMessage || undefined,
        }),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        setInviteMessage('');
        fetchInvitations();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchInvitations();
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!project?.id) return;
    const confirmed = await showConfirm({ title: 'Remove Member', message: 'Are you sure you want to remove this member?', variant: 'danger' });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown size={16} className="text-yellow-500" />;
      case 'EDITOR':
        return <Shield size={16} className="text-blue-500" />;
      default:
        return <Eye size={16} className="text-gray-500" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'Owner';
      case 'EDITOR':
        return 'Editor';
      default:
        return 'Viewer';
    }
  };

  const isOwner = project?.ownerId === currentUser?.id;

  if (!_hasHydrated || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
          Loading...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4">Project does not exist</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen texture-lines">
      {/* Navigation */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <Link href={`/project/${project.slug}`} className="hover:opacity-70 shrink-0">
                <ArrowLeft size={20} strokeWidth={1.5} />
              </Link>
              <Link href="/dashboard" className="font-display text-xl md:text-2xl tracking-tight shrink-0 hidden md:block">
                CodeHost
              </Link>
              <ChevronRight size={16} className="text-muted-foreground shrink-0 hidden md:block" />
              <Link href={`/project/${project.slug}`} className="font-display text-lg md:text-xl hover:underline truncate">
                {project.name}
              </Link>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              <span className="font-display text-lg md:text-xl shrink-0">Member Management</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        {/* Invite member area */}
        <div className="border-4 border-foreground p-6 mb-8">
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
            <UserPlus size={24} />
            Invite Member
          </h2>
          
          <div className="relative">
            <div className="flex items-center gap-2 border-2 border-foreground p-2">
              <Search size={20} className="text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus:ring-0 flex-1"
              />
              {searching && (
                <span className="text-sm text-muted-foreground">Searching...</span>
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 border-2 border-t-0 border-foreground bg-background z-10 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowInviteModal(true);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <Avatar className="w-8 h-8">
                      {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                      <AvatarFallback className="text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <UserPlus size={18} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 border-2 border-t-0 border-foreground bg-background p-4 text-center text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="border-4 border-foreground p-6 mb-8">
            <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
              <Clock size={24} />
              Pending Invitations
            </h2>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 border-2 border-foreground"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {inv.receiver.avatar && <AvatarImage src={inv.receiver.avatar} alt={inv.receiver.name} />}
                      <AvatarFallback>
                        {inv.receiver.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{inv.receiver.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {inv.receiver.email} · {getRoleText(inv.role)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvitation(inv.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X size={18} />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="border-4 border-foreground p-6">
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
            <Users size={24} />
            Project Members ({members.length})
          </h2>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border-2 border-foreground"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {member.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.user.name}
                      {getRoleIcon(member.role)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {getRoleText(member.role)}
                  </span>
                  {isOwner && member.role !== 'OWNER' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Invite confirmation modal */}
      {showInviteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border-4 border-foreground p-6 w-full max-w-md mx-4">
            <h3 className="font-display text-2xl mb-4">Invite Member</h3>
            
            <div className="flex items-center gap-3 p-3 border-2 border-foreground mb-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback>
                  {selectedUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{selectedUser.name}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-2">Role</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 p-3 border-2 ${
                    selectedRole === 'EDITOR'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-foreground'
                  }`}
                  onClick={() => setSelectedRole('EDITOR')}
                >
                  <Shield size={18} className="mx-auto mb-1" />
                  <span className="text-sm">Editor</span>
                </button>
                <button
                  className={`flex-1 p-3 border-2 ${
                    selectedRole === 'VIEWER'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-foreground'
                  }`}
                  onClick={() => setSelectedRole('VIEWER')}
                >
                  <Eye size={18} className="mx-auto mb-1" />
                  <span className="text-sm">Viewer</span>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-medium mb-2">Invitation Message (optional)</label>
              <Input
                type="text"
                placeholder="Add a message..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="border-2 border-foreground"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleInvite}>
                <Check size={18} className="mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

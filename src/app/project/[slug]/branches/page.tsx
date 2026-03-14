'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  GitBranch,
  Plus,
  Star,
  GitCommit,
} from 'lucide-react';
import { Button, Input, Avatar, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  _count: {
    commits: number;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function BranchesPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [creating, setCreating] = useState(false);

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
      fetchBranches();
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
    }
  };

  const fetchBranches = async () => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to get branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !project?.id) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newBranchName }),
      });

      if (res.ok) {
        setNewBranchName('');
        setShowCreate(false);
        fetchBranches();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create branch', 'error');
      }
    } catch (error) {
      console.error('Failed to create branch:', error);
    } finally {
      setCreating(false);
    }
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  if (loading && !project) {
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
            <span className="font-display text-lg md:text-xl shrink-0">Branch Management</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GitBranch size={24} strokeWidth={1.5} />
            <h1 className="font-display text-3xl">Branch Management</h1>
            <span className="font-mono text-sm text-muted-foreground">
              ({branches.length} branches)
            </span>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus size={16} className="mr-2" />
            New Branch
          </Button>
        </div>

        {/* Create branch form */}
        {showCreate && (
          <form
            onSubmit={handleCreateBranch}
            className="border-4 border-foreground p-4 mb-8 flex items-center gap-4"
          >
            <Input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name (e.g. feature/new-page)"
              className="flex-1"
              required
            />
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="border-2 border-dashed border-border-light p-12 text-center">
            <GitBranch size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-xl mb-2">No branches</h3>
            <p className="text-muted-foreground">A main branch is automatically created when the project is created.</p>
          </div>
        ) : (
          <div className="border-4 border-foreground">
            {branches.map((branch, index) => (
              <div
                key={branch.id}
                className={`flex items-center justify-between p-4 ${
                  index < branches.length - 1 ? 'border-b-2 border-foreground' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <GitBranch size={18} strokeWidth={1.5} />
                  <span className="font-mono text-sm font-medium">{branch.name}</span>
                  {branch.isDefault && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-foreground text-background text-xs font-mono">
                      <Star size={12} />
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitCommit size={14} />
                    {branch._count.commits} commits
                  </span>
                  <span>{formatDate(branch.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

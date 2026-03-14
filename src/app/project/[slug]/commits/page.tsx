'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  History,
  GitCommit,
  User,
} from 'lucide-react';
import { Button, Avatar, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';

interface Commit {
  id: string;
  message: string;
  hash: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  _count?: {
    fileVersions: number;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function CommitsPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchCommits();
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

  const fetchCommits = async () => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/commits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const commitList = data.commits || data;
        setCommits(Array.isArray(commitList) ? commitList : []);
      }
    } catch (error) {
      console.error('Failed to get commits:', error);
    } finally {
      setLoading(false);
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
            <span className="font-display text-lg md:text-xl shrink-0">Commit History</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-8">
          <History size={24} strokeWidth={1.5} />
          <h1 className="font-display text-3xl">Commit History</h1>
          <span className="font-mono text-sm text-muted-foreground">
            ({commits.length} commits)
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : commits.length === 0 ? (
          <div className="border-2 border-dashed border-border-light p-12 text-center">
            <GitCommit size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-xl mb-2">No commit records</h3>
            <p className="text-muted-foreground">Commit records will be automatically generated after uploading files.</p>
          </div>
        ) : (
          <div className="border-4 border-foreground">
            {commits.map((commit, index) => (
              <div
                key={commit.id}
                className={`flex items-start gap-4 p-4 ${
                  index < commits.length - 1 ? 'border-b-2 border-foreground' : ''
                }`}
              >
                <div className="mt-1">
                  <GitCommit size={20} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-1">{commit.message}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[10px]">
                          {commit.author.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{commit.author.name}</span>
                    </div>
                    <span>·</span>
                    <span>{formatDate(commit.timestamp)}</span>
                    {commit._count?.fileVersions !== undefined && (
                      <>
                        <span>·</span>
                        <span>{commit._count.fileVersions} files</span>
                      </>
                    )}
                  </div>
                </div>
                <code className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 flex-shrink-0">
                  {commit.hash.slice(0, 8)}
                </code>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

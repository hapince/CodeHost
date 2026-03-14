'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, FolderGit2, Globe, Users, FileCode, GitCommit } from 'lucide-react';
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardFooter,
  Avatar, AvatarFallback, AvatarImage
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/lib/utils';

interface PublicUser {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  ownedProjects: Array<{
    id: string;
    name: string;
    description: string | null;
    slug: string;
    price: number;
    updatedAt: string;
    _count: {
      members: number;
      files: number;
      commits: number;
    };
  }>;
  _count: {
    ownedProjects: number;
  };
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, [params.userId]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${params.userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setError('User does not exist');
      }
    } catch {
      setError('Loading failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center texture-lines">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen texture-lines flex flex-col">
        <nav className="border-b-4 border-foreground">
          <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
            <Link href="/explore" className="font-display text-2xl tracking-tight">CodeHost</Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-3xl mb-4">{error || 'User does not exist'}</h2>
            <Link href="/explore">
              <Button variant="outline">
                <ArrowLeft size={16} className="mr-2" /> Back to Explore
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navbar */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/explore" className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/explore">
                <Button variant="ghost" size="sm">
                  <ArrowLeft size={16} className="mr-1 md:mr-2" /> Browse Projects
                </Button>
              </Link>
              {_hasHydrated && isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="sm">Log In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-12 flex-1 w-full">
        {/* User info card */}
        <div className="border-2 border-foreground p-8 mb-8">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="text-3xl">
                {user.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight">{user.name}</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-2">
                <Calendar size={14} /> Joined on {new Date(user.createdAt).toLocaleDateString('en-US')}
              </p>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <FolderGit2 size={14} /> {user._count.ownedProjects} public projects
              </p>
            </div>
          </div>
        </div>

        {/* Public project list */}
        <h2 className="font-display text-2xl tracking-tight mb-6">Public Projects</h2>
        {user.ownedProjects.length === 0 ? (
          <div className="border-2 border-dashed border-border-light p-12 text-center">
            <Globe size={40} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">This user has no public projects</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.ownedProjects.map((project) => (
              <Link key={project.id} href={`/explore/${project.slug}`}>
                <Card className="cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{project.name}</CardTitle>
                      <div className="flex items-center gap-2 shrink-0">
                        {project.price > 0 && (
                          <span className="text-xs bg-foreground text-background px-2 py-0.5 font-mono">
                            ${project.price.toFixed(2)}
                          </span>
                        )}
                        <Globe size={18} strokeWidth={1.5} className="text-muted-foreground" />
                      </div>
                    </div>
                    <CardDescription>
                      {project.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {project._count.members}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCode size={12} /> {project._count.files}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitCommit size={12} /> {project._count.commits}
                      </span>
                    </div>
                    <span className="font-mono text-xs">
                      {formatDate(project.updatedAt)}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-display text-xl">CodeHost</div>
            <div className="text-sm text-muted-foreground text-center">
              Powered by <span className="font-semibold">Hapince Technology</span>
            </div>
            <div className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              © {new Date().getFullYear()} Hapince Tech. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

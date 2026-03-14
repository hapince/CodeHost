'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Lock, Globe, MoreHorizontal, LogOut, Settings, User, Search, ChevronLeft, ChevronRight, ShoppingCart, Star, Shield, Store, ClipboardList } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  NotificationCenter,
} from '@/components/ui';
import { useAuthStore, useProjectStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import AiChat from '@/components/AiChat';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, logout, isAuthenticated, _hasHydrated } = useAuthStore();
  const { showToast } = useToast();
  const { projects, setProjects, addProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    isPrivate: true,
    language: '',
  });
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const PAGE_SIZE = 9;

  const LANGUAGES = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust',
    'C/C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'HTML/CSS', 'Other',
  ];

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for Zustand to restore state from localStorage
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchProjects();
  }, [_hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      fetchProjects();
    }
  }, [currentPage]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?page=${currentPage}&limit=${PAGE_SIZE}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects);
        setTotalPages(data.totalPages);
        setTotalProjects(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newProject,
          language: newProject.language || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addProject(data);
        setCreateDialogOpen(false);
        setNewProject({ name: '', description: '', isPrivate: true, language: '' });
        router.push(`/project/${data.slug}`);
      } else {
        showToast(data.error || 'Failed to create project, please try again later', 'error');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      showToast('Network error, failed to create project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navigation */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/explore" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <Globe size={16} className="mr-2" />
                  Projects
                </Button>
              </Link>
              <Link href="/shop" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <Store size={16} className="mr-2" />
                  Shop
                </Button>
              </Link>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus size={16} className="mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Create a new code project and start collaborating.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        value={newProject.name}
                        onChange={(e) =>
                          setNewProject({ ...newProject, name: e.target.value })
                        }
                        placeholder="My new project"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Project Description</Label>
                      <Textarea
                        id="description"
                        value={newProject.description}
                        onChange={(e) =>
                          setNewProject({ ...newProject, description: e.target.value })
                        }
                        placeholder="Describe your project..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Tech Stack / Language</Label>
                      <select
                        id="language"
                        value={newProject.language}
                        onChange={(e) =>
                          setNewProject({ ...newProject, language: e.target.value })
                        }
                        className="w-full border-2 border-border-light px-3 py-2 text-sm bg-background focus:border-foreground focus:outline-none transition-colors"
                      >
                        <option value="">Uncategorized</option>
                        {LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setNewProject({ ...newProject, isPrivate: true })
                        }
                        className={`flex-1 border-2 p-4 transition-colors ${
                          newProject.isPrivate
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border-light hover:border-foreground'
                        }`}
                      >
                        <Lock size={20} className="mx-auto mb-2" />
                        <span className="font-mono text-xs tracking-widest uppercase">
                          Private
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewProject({ ...newProject, isPrivate: false })
                        }
                        className={`flex-1 border-2 p-4 transition-colors ${
                          !newProject.isPrivate
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border-light hover:border-foreground'
                        }`}
                      >
                        <Globe size={20} className="mx-auto mb-2" />
                        <span className="font-mono text-xs tracking-widest uppercase">
                          Public
                        </span>
                      </button>
                    </div>
                    <Button type="submit" className="w-full" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Project →'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Notification Center */}
              <NotificationCenter />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus-ring">
                    <Avatar>
                      {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                      <AvatarFallback>
                        {user?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/orders')}>
                    <ClipboardList size={16} className="mr-2" />
                    My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/cart')}>
                    <ShoppingCart size={16} className="mr-2" />
                    My Cart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/stars')}>
                    <Star size={16} className="mr-2" />
                    My Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings size={16} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  {user?.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/codeadmin')}>
                        <Shield size={16} className="mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut size={16} className="mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {/* Mobile: Browse Public Projects + Shop row */}
        <div className="md:hidden border-t-2 border-foreground">
          <div className="max-w-6xl mx-auto px-6 py-2 flex gap-2">
            <Link href="/explore" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full justify-center">
                <Globe size={16} className="mr-2" />
                Projects
              </Button>
            </Link>
            <Link href="/shop" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full justify-center">
                <Store size={16} className="mr-2" />
                Shop
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl tracking-tight mb-2">
              Hello, {user?.name}
            </h1>
            <p className="text-muted-foreground">
              Manage your projects and start collaborating.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
              Loading...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border-light">
            <h3 className="font-display text-2xl mb-4">No projects yet</h3>
            <p className="text-muted-foreground mb-8">
              Start creating your first project to collaborate.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.slug}`}>
                <Card className="cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{project.name}</CardTitle>
                      {project.isPrivate ? (
                        <Lock size={18} strokeWidth={1.5} className="group-hover:text-background" />
                      ) : (
                        <Globe size={18} strokeWidth={1.5} className="group-hover:text-background" />
                      )}
                    </div>
                    <CardDescription>
                      {project.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <span className="font-mono text-xs tracking-widest uppercase">
                      {project._count?.members || 1} members
                    </span>
                    <span className="font-mono text-xs">
                      {formatDate(project.updatedAt)}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={16} className="mr-1" /> Previous
            </Button>
            <span className="font-mono text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground mt-auto">
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

      {/* AI Chat Assistant */}
      <AiChat />
    </div>
  );
}

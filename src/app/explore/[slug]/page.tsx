'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Globe, Users, FileCode, GitCommit, Download, Lock,
  Calendar, User as UserIcon, FolderOpen, FileText, CheckCircle, ShoppingCart, Star
} from 'lucide-react';
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardFooter,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Avatar, AvatarImage, AvatarFallback
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import ProjectComments from '@/components/ProjectComments';
import AiChat from '@/components/AiChat';

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPrivate: boolean;
  price: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      avatar: string | null;
    };
  }>;
  branches: Array<{
    id: string;
    name: string;
    isDefault: boolean;
  }>;
  _count: {
    files: number;
    commits: number;
  };
}

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: string;
}

export default function PublicProjectPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, token, user } = useAuthStore();
  const { showToast } = useToast();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [starred, setStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);

  useEffect(() => {
    fetchProject();
  }, [params.slug]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/by-slug/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        // If redirect is returned (when slug is a project ID)
        if (data.redirect) {
          router.replace(data.redirect);
          return;
        }
        if (data.isPrivate) {
          setError('This project is private');
          setLoading(false);
          return;
        }
        setProject(data);
        fetchFiles(data.id);
        fetchStarStatus(data.id);
        // Check if already purchased
        if (token) {
          checkPurchased(data.id);
        }
      } else {
        const data = await res.json();
        // Handle 301 redirect (when slug is a project ID)
        if (data.redirect) {
          router.replace(data.redirect);
          return;
        }
        setError(data.error || 'Project does not exist');
      }
    } catch (err) {
      setError('Loading failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files/public`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch file list');
    }
  };

  const checkPurchased = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/purchase`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchased(data.purchased);
      }
    } catch (err) {
      // ignore
    }
  };

  const isOwner = project && user && project.owner.id === user.id;
  const isFree = project && project.price <= 0;
  const canDownload = isOwner || isFree || purchased;

  const fetchStarStatus = async (projectId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/projects/${projectId}/star`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStarred(data.starred);
        setStarCount(data.starCount);
      }
    } catch (err) {}
  };

  const toggleStar = async () => {
    if (!project) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      const res = await fetch(`/api/projects/${project.id}/star`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStarred(data.starred);
        setStarCount(data.starCount);
      }
    } catch (err) {}
  };

  const handleDownload = async () => {
    if (!project) return;
    if (canDownload) {
      // Already has download access, trigger download directly
      await doDownload();
      return;
    }
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Needs purchase, show payment dialog
    setPayDialogOpen(true);
    setPurchaseError('');
    // Get current balance
    if (token) {
      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setUserBalance(data.balance || 0); }
      } catch {}
    }
  };

  const doDownload = async () => {
    if (!project) return;
    setDownloading(true);
    try {
      const currentToken = useAuthStore.getState().token;
      const headers: Record<string, string> = {};
      if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
      const res = await fetch(`/api/projects/${project.id}/download`, { headers });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'Please log in first') {
          router.push('/login');
          return;
        }
        showToast(data.error || 'Download failed', 'error');
        return;
      }
      const data = await res.json();
      // Package as ZIP format using JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const f of data.files) {
        if (f.type === 'FILE') {
          if (f.content && f.content.startsWith('data:')) {
            // base64 binary file
            const base64Data = f.content.split(',')[1];
            if (base64Data) zip.file(f.path, base64Data, { base64: true });
          } else {
            zip.file(f.path, f.content || '');
          }
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.projectSlug || project.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Download failed, please try again', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePurchase = async () => {
    if (!project || !token) return;
    setPurchasing(true);
    setPurchaseError('');
    try {
      const res = await fetch(`/api/projects/${project.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPurchased(true);
        setPayDialogOpen(false);
        // Auto-start download after successful purchase
        await doDownload();
      } else {
        setPurchaseError(data.error || 'Purchase failed');
      }
    } catch (err) {
      setPurchaseError('Network error, please try again');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center texture-lines">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen texture-lines flex flex-col">
        <nav className="border-b-4 border-foreground">
          <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
            <Link href="/explore" className="font-display text-2xl tracking-tight">CodeHost</Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-3xl mb-4">{error || 'Project does not exist'}</h2>
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
                  <ArrowLeft size={16} className="mr-1 md:mr-2" /> <span className="hidden md:inline">Browse More</span><span className="md:hidden">Back</span>
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
        {/* Project header */}
        <div className="border-2 border-foreground p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Globe size={20} className="text-muted-foreground" />
                <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
                  Public Project
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-2">{project.name}</h1>
              <p className="text-lg text-muted-foreground">
                {project.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start">
              <button onClick={toggleStar}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 text-sm transition-colors ${
                  starred ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-foreground hover:bg-muted'
                }`}>
                <Star size={16} fill={starred ? 'currentColor' : 'none'} />
                <span className="font-mono">{starCount}</span>
              </button>
              <Button onClick={handleDownload} size="sm" disabled={downloading}>
              {downloading ? (
                <><Download size={16} className="mr-2 animate-pulse" /> Downloading...</>
              ) : canDownload ? (
                <><Download size={16} className="mr-2" /> {isFree ? 'Free Download' : 'Download Project'}</>
              ) : (
                <><ShoppingCart size={16} className="mr-2" /> ${project.price.toFixed(2)} Purchase</>
              )}
            </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-6 text-sm text-muted-foreground">
            <Link href={`/user/${project.owner.id}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Avatar className="w-5 h-5">
                {project.owner.avatar && <AvatarImage src={project.owner.avatar} alt={project.owner.name} />}
                <AvatarFallback className="text-[8px]">{project.owner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {project.owner.name}
            </Link>
            <span className="flex items-center gap-2">
              <Calendar size={14} /> Created on {new Date(project.createdAt).toLocaleDateString('en-US')}
            </span>
            <span className="flex items-center gap-2">
              <Users size={14} /> {project.members.length} Members
            </span>
            <span className="flex items-center gap-2">
              <FileCode size={14} /> {project._count.files} Files
            </span>
            <span className="flex items-center gap-2">
              <GitCommit size={14} /> {project._count.commits} Commits
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* File list */}
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl tracking-tight mb-4">File List</h2>
            {files.length === 0 ? (
              <div className="border-2 border-dashed border-border-light p-12 text-center">
                <FolderOpen size={40} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No files</p>
              </div>
            ) : (() => {
              const sortedFiles = [...files].sort((a, b) => {
                if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
                if (a.type !== 'FOLDER' && b.type === 'FOLDER') return 1;
                return a.name.localeCompare(b.name);
              }).slice(0, 20);
              return (
                <div className="border-2 border-foreground divide-y-2 divide-foreground">
                  {sortedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors">
                      {file.type === 'FOLDER' ? (
                        <FolderOpen size={16} className="text-muted-foreground shrink-0" />
                      ) : (
                        <FileText size={16} className="text-muted-foreground shrink-0" />
                      )}
                      <span className="font-mono text-sm">{file.name}</span>
                    </div>
                  ))}
                  {files.length > 20 && (
                    <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                      {files.length - 20} more files not shown
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sidebar info */}
          <div className="space-y-6">
            {/* Branches */}
            <div className="border-2 border-foreground p-6">
              <h3 className="font-display text-lg mb-3">Branches</h3>
              {project.branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No branches</p>
              ) : (
                <div className="space-y-2">
                  {project.branches.map((branch) => (
                    <div key={branch.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono">{branch.name}</span>
                      {branch.isDefault && (
                        <span className="text-xs bg-foreground text-background px-2 py-0.5">Default</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="border-2 border-foreground p-6">
              <h3 className="font-display text-lg mb-3">Members</h3>
              <div className="space-y-3">
                {project.members.map((member) => (
                  <Link key={member.id} href={`/user/${member.user.id}`} className="flex items-center gap-3 hover:bg-muted p-2 -mx-2 transition-colors cursor-pointer">
                    <Avatar className="w-8 h-8">
                      {member.user.avatar && <AvatarImage src={member.user.avatar} alt={member.user.name} />}
                      <AvatarFallback className="text-xs">
                        {member.user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Download */}
            <div className="border-2 border-foreground p-6">
              <h3 className="font-display text-lg mb-3">Download</h3>
              {purchased && (
                <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                  <CheckCircle size={16} /> Purchased
                </div>
              )}
              {isFree ? (
                <p className="text-sm text-muted-foreground mb-4">
                  This project is free to download.
                </p>
              ) : canDownload ? (
                <p className="text-sm text-muted-foreground mb-4">
                  You can download the full source code of this project.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Downloading the full source code requires payment of ${project.price.toFixed(2)}.
                </p>
              )}
              <Button className="w-full" onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <><Download size={16} className="mr-2 animate-pulse" /> Downloading...</>
                ) : canDownload ? (
                  <><Download size={16} className="mr-2" /> {isFree ? 'Free Download' : 'Download'}</>
                ) : (
                  <><ShoppingCart size={16} className="mr-2" /> ${project.price.toFixed(2)} Purchase & Download</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Comments */}
        {project && <ProjectComments projectId={project.id} />}
      </main>

      {/* Purchase dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Project</DialogTitle>
            <DialogDescription>
              Purchase full source code download access for "{project.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="border-2 border-foreground p-6 text-center">
              <p className="font-display text-3xl mb-2">${project.price.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Buy once, download forever</p>
            </div>
            {userBalance !== null && (
              <div className="border-2 border-foreground p-4 flex items-center justify-between">
                <span className="text-sm">Current Balance</span>
                <span className={`font-display text-xl ${userBalance < project.price ? 'text-destructive' : ''}`}>
                  ${userBalance.toFixed(2)}
                </span>
              </div>
            )}
            {userBalance !== null && userBalance < project.price && (
              <div className="bg-destructive/10 border-2 border-destructive p-3 text-sm text-destructive">
                Insufficient balance, after purchase balance will be ${(userBalance - project.price).toFixed(2)}. Please top up first.
              </div>
            )}
            {userBalance !== null && userBalance >= project.price && (
              <div className="text-sm text-muted-foreground text-center">
                Balance after purchase: ${(userBalance - project.price).toFixed(2)}
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <FileCode size={14} /> Full source code with {project._count.files} files
              </div>
              <div className="flex items-center gap-2 text-sm">
                <GitCommit size={14} /> {project._count.commits} commit history included
              </div>
            </div>
            {purchaseError && (
              <div className="bg-destructive/10 border-2 border-destructive p-3 text-sm text-destructive">
                {purchaseError}
              </div>
            )}
            <div className="flex gap-4">
              <Button className="flex-1" onClick={handlePurchase} disabled={purchasing || (userBalance !== null && userBalance < project.price)}>
                {purchasing ? 'Purchasing...' : `Confirm Purchase $${project.price.toFixed(2)}`}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setPayDialogOpen(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              The purchase amount will be deducted from your account balance. Revenue goes to the project owner.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Assistant */}
      <AiChat />

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

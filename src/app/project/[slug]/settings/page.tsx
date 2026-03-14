'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Settings,
  Lock,
  Globe,
  Trash2,
  Save,
} from 'lucide-react';
import { Button, Input, Textarea, Label } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui/toast';

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPrivate: boolean;
  isArchived: boolean;
  price: number;
  language?: string | null;
  ownerId: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, user, _hasHydrated } = useAuthStore();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [price, setPrice] = useState('0');
  const [language, setLanguage] = useState('');

  const LANGUAGES = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust',
    'C/C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'HTML/CSS', 'Other',
  ];

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProject();
  }, [_hasHydrated, isAuthenticated, params.slug]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/by-slug/${params.slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setName(data.name);
        setDescription(data.description || '');
        setIsPrivate(data.isPrivate);
        setPrice((data.price || 0).toString());
        setLanguage(data.language || '');
      }
    } catch (error) {
      console.error('Failed to get project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, isPrivate, price: parseFloat(price) || 0, language: language || null }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProject({ ...project, ...updated });
        showToast('Project settings saved', 'success');
      } else {
        const error = await res.json();
        showToast(error.error || 'Save failed', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id || confirmDelete !== project.name) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        const error = await res.json();
        showToast(error.error || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeleting(false);
    }
  };

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

  const isOwner = project.ownerId === user?.id;

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
            <span className="font-display text-lg md:text-xl shrink-0">Project Settings</span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings size={24} strokeWidth={1.5} />
          <h1 className="font-display text-3xl">Project Settings</h1>
        </div>

        {/* Basic Information */}
        <form onSubmit={handleSave} className="border-4 border-foreground p-6 mb-8">
          <h2 className="font-display text-xl mb-6">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                required
                disabled={!isOwner}
              />
            </div>

            <div>
              <Label htmlFor="description">Project Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                placeholder="Describe your project..."
                disabled={!isOwner}
              />
            </div>

            <div>
              <Label>Visibility</Label>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => isOwner && setIsPrivate(true)}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 transition-colors ${
                    isPrivate
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border-light hover:border-foreground'
                  } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isOwner}
                >
                  <Lock size={16} />
                  <span className="font-mono text-xs tracking-widest uppercase">Private</span>
                </button>
                <button
                  type="button"
                  onClick={() => isOwner && setIsPrivate(false)}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 transition-colors ${
                    !isPrivate
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border-light hover:border-foreground'
                  } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isOwner}
                >
                  <Globe size={16} />
                  <span className="font-mono text-xs tracking-widest uppercase">Public</span>
                </button>
              </div>
            </div>

            {/* Tech Stack / Language */}
            <div>
              <Label htmlFor="language">Tech Stack / Language</Label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 w-full border-2 border-border-light px-3 py-2 text-sm bg-background focus:border-foreground focus:outline-none transition-colors disabled:opacity-50"
                disabled={!isOwner}
              >
                <option value="">Uncategorized</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the main tech stack or programming language for your project for easier browsing.
              </p>
            </div>

            {/* Pricing settings */}
            {!isPrivate && (
              <div>
                <Label htmlFor="price">Project Pricing ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1"
                  placeholder="0 means free"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set to 0 for free download. Values greater than 0 require payment before downloading. Revenue goes directly to your personal balance.
                </p>
              </div>
            )}

            {isOwner && (
              <Button type="submit" disabled={saving} className="w-full">
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            )}
          </div>
        </form>

        {/* Danger Zone */}
        {isOwner && (
          <div className="border-4 border-red-500 p-6">
            <h2 className="font-display text-xl mb-2 text-red-500 flex items-center gap-2">
              <Trash2 size={20} />
              Danger Zone
            </h2>
            <p className="text-muted-foreground mb-4">
              Deleting a project will permanently remove all files, commit records, and member relationships. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="confirm-delete" className="text-red-500">
                  Type the project name "{project.name}" to confirm deletion
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  className="mt-1 border-red-500"
                  placeholder={project.name}
                />
              </div>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={confirmDelete !== project.name || deleting}
                className="w-full bg-red-500 hover:bg-red-600 border-red-500"
              >
                <Trash2 size={16} className="mr-2" />
                {deleting ? 'Deleting...' : 'Permanently Delete Project'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

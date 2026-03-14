'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Globe, Users, FileCode, GitCommit, ArrowLeft, ArrowRight, DollarSign, Star } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardFooter, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/lib/utils';

interface PublicProject {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  price: number;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
  _count: {
    members: number;
    files: number;
    commits: number;
    stars: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ExplorePage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    fetchProjects();
  }, [pagination.page, search, selectedLanguage, sortBy]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '15',
      });
      if (search) params.set('search', search);
      if (selectedLanguage) params.set('language', selectedLanguage);
      if (sortBy) params.set('sort', sortBy);

      const res = await fetch(`/api/projects/public?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch public projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navbar */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
            <div className="flex items-center gap-4">
              {_hasHydrated && isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm">Dashboard →</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log In</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Register →</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b-2 border-foreground bg-muted">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-16">
          <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4">
            Explore Public Projects
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Browse open source project code shared by community developers
          </p>
          <form onSubmit={handleSearch} className="flex gap-4 max-w-xl">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search project name or description..."
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          {/* Language filter */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['', 'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C/C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'HTML/CSS', 'Other'].map((lang) => (
              <button
                key={lang}
                onClick={() => { setSelectedLanguage(lang); setPagination(prev => ({ ...prev, page: 1 })); }}
                className={`px-3 py-1 text-xs font-mono border-2 transition-colors ${
                  selectedLanguage === lang
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border-light hover:border-foreground'
                }`}
              >
                {lang || 'All'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Project list */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        {loading ? (
          <div className="text-center py-24">
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
              Loading...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border-light">
            <Globe size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-2xl mb-4">No public projects</h3>
            <p className="text-muted-foreground">
              {search ? 'No matching projects found. Try other keywords.' : 'No developers have shared public projects yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm text-muted-foreground">
                {pagination.total} public projects
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setSortBy('latest'); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className={`px-3 py-1 text-xs font-mono border-2 transition-colors ${sortBy === 'latest' ? 'border-foreground bg-foreground text-background' : 'border-border-light hover:border-foreground'}`}>
                  Newest
                </button>
                <button onClick={() => { setSortBy('stars'); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className={`px-3 py-1 text-xs font-mono border-2 transition-colors flex items-center gap-1 ${sortBy === 'stars' ? 'border-foreground bg-foreground text-background' : 'border-border-light hover:border-foreground'}`}>
                  <Star size={10} /> Most Stars
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link key={project.id} href={`/explore/${project.slug}`}>
                  <Card className="cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{project.name}</CardTitle>
                        <div className="flex items-center gap-2 shrink-0">
                          {project.price > 0 ? (
                            <span className="text-xs font-mono bg-foreground text-background px-2 py-0.5">
                              ${project.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs font-mono border border-foreground px-2 py-0.5">
                              Free
                            </span>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        {project.description || 'No description'}
                      </CardDescription>
                      {project.language && (
                        <span className="inline-block text-[10px] font-mono border border-border-light px-1.5 py-0.5 mt-1 w-fit">
                          {project.language}
                        </span>
                      )}
                    </CardHeader>
                    <CardFooter>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Link
                          href={`/user/${project.owner.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Avatar className="w-4 h-4">
                            {project.owner.avatar && <AvatarImage src={project.owner.avatar} alt={project.owner.name} />}
                            <AvatarFallback className="text-[6px]">{project.owner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {project.owner.name}
                        </Link>
                        <span className="flex items-center gap-1">
                          <FileCode size={12} /> {project._count.files}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitCommit size={12} /> {project._count.commits}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" /> {project._count.stars}
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ArrowLeft size={16} className="mr-1" /> Previous
                </Button>
                <span className="font-mono text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next <ArrowRight size={16} className="ml-1" />
                </Button>
              </div>
            )}
          </>
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

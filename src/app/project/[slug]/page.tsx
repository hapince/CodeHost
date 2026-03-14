'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileCode,
  GitBranch,
  History,
  Settings,
  Users,
  Plus,
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Code2,
} from 'lucide-react';
import { Button, Avatar, AvatarImage, AvatarFallback, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import ProjectComments from '@/components/ProjectComments';
import AiChat from '@/components/AiChat';
import { useToast } from '@/components/ui/toast';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isPrivate: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
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
  type: 'FILE' | 'FOLDER';
  children?: FileItem[];
  versions?: Array<{
    id: string;
    size: number;
    createdAt: string;
    author: {
      id: string;
      name: string;
    };
  }>;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, phase: '' });
  const [downloading, setDownloading] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

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
      const data = await res.json();
      if (res.ok) {
        setProject(data);
      } else {
        console.error('Failed to get project:', data.error);
      }
    } catch (error) {
      console.error('Failed to get project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    if (!project?.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setFiles(data);
    } catch (error) {
      console.error('Failed to get files:', error);
    }
  };

  useEffect(() => {
    if (project?.id) fetchFiles();
  }, [project?.id]);

  const handleCreateFile = async () => {
    if (!newFileName.trim() || !project) return;
    const name = newFileName.trim();
    const parts = name.split('/');
    const fileName = parts[parts.length - 1];
    try {
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const folderPath = parts.slice(0, i + 1).join('/');
          try {
            await fetch(`/api/projects/${project.id}/files`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ name: parts[i], path: folderPath, type: 'FOLDER' }),
            });
          } catch { /* may exist */ }
        }
      }
      const res = await fetch(`/api/projects/${project.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: fileName, path: name, type: 'FILE', content: '' }),
      });
      if (res.ok) {
        setNewFileName('');
        setShowNewFileInput(false);
        await fetchFiles();
        router.push(`/project/${project.slug}/ide`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create file', 'error');
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || !project) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 0, phase: 'Scanning files...' });
    try {
      // Filter files to upload
      const validFiles: { file: globalThis.File; cleanPath: string }[] = [];
      for (let i = 0; i < inputFiles.length; i++) {
        const f = inputFiles[i];
        const relativePath = f.webkitRelativePath || f.name;
        const cleanPath = relativePath.split('/').slice(1).join('/');
        if (!cleanPath) continue;
        const skip = ['node_modules/', '.git/', '.next/', '__pycache__/', '.DS_Store', 'Thumbs.db', 'dist/', 'build/', '.cache/', 'target/'];
        if (skip.some((p) => cleanPath.includes(p))) continue;
        if (f.size > 5 * 1024 * 1024) continue;
        validFiles.push({ file: f, cleanPath });
      }
      if (validFiles.length === 0) { showToast('No uploadable files found', 'warning'); return; }

      const totalFiles = validFiles.length;
      setUploadProgress({ current: 0, total: totalFiles, phase: 'Reading files...' });

      const fileArray: { path: string; content: string; type: string; isBinary?: boolean }[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const { file, cleanPath } = validFiles[i];
        setUploadProgress({ current: i + 1, total: totalFiles, phase: `Reading files (${i + 1}/${totalFiles})` });
        try {
          const { content, isBinary } = await readFileAsText(file);
          fileArray.push({ path: cleanPath, content, type: 'FILE', isBinary });
        } catch { continue; }
      }
      if (fileArray.length === 0) { showToast('No uploadable files found', 'warning'); return; }

      setUploadProgress({ current: 0, total: 1, phase: `Uploading ${fileArray.length} files...` });
      const res = await fetch(`/api/projects/${project.id}/files/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ files: fileArray }),
      });
      const data = await res.json();
      if (res.ok) { showToast(`Upload successful! ${data.message}`, 'success'); await fetchFiles(); }
      else showToast(data.error || 'Upload failed', 'error');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploading(false); setUploadProgress({ current: 0, total: 0, phase: '' }); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || !project) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 0, phase: 'Scanning files...' });
    try {
      const totalFiles = inputFiles.length;
      setUploadProgress({ current: 0, total: totalFiles, phase: 'Reading files...' });

      const fileArray: { path: string; content: string; type: string; isBinary?: boolean }[] = [];
      for (let i = 0; i < inputFiles.length; i++) {
        const f = inputFiles[i];
        if (f.size > 50 * 1024 * 1024) { showToast(`File ${f.name} exceeds 50MB, skipped`, 'warning'); continue; }
        setUploadProgress({ current: i + 1, total: totalFiles, phase: `Reading files (${i + 1}/${totalFiles})` });
        try {
          const { content, isBinary } = await readFileAsText(f);
          fileArray.push({ path: f.name, content, type: 'FILE', isBinary });
        } catch { continue; }
      }
      if (fileArray.length === 0) { showToast('No uploadable files', 'warning'); return; }

      setUploadProgress({ current: 0, total: 1, phase: `Uploading ${fileArray.length} files...` });
      const res = await fetch(`/api/projects/${project.id}/files/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ files: fileArray }),
      });
      const data = await res.json();
      if (res.ok) { showToast(`Upload successful! ${data.message}`, 'success'); await fetchFiles(); }
      else showToast(data.error || 'Upload failed', 'error');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploading(false); setUploadProgress({ current: 0, total: 0, phase: '' }); if (singleFileInputRef.current) singleFileInputRef.current.value = ''; }
  };

  const handleDownload = async () => {
    if (!project) return;
    // Project members can download for free
    const isMember = project.members.some(m => m.user.id === useAuthStore.getState().user?.id);
    if (!isMember) {
      setPayDialogOpen(true);
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Download failed', 'error'); return; }
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const file of data.files) { if (file.type === 'FILE') zip.file(file.path, file.content || ''); }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${data.projectSlug}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('Download failed', 'error'); }
    finally { setDownloading(false); }
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4">Project does not exist</h1>
          <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen texture-lines">
      <input ref={fileInputRef} type="file" className="hidden"
        // @ts-ignore
        webkitdirectory="" multiple onChange={handleProjectUpload} />
      <input ref={singleFileInputRef} type="file" className="hidden"
        multiple onChange={handleFileUpload} />

      {/* Navigation */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <Link href="/dashboard" className="hover:opacity-70 shrink-0"><ArrowLeft size={20} strokeWidth={1.5} /></Link>
              <Link href="/dashboard" className="font-display text-xl md:text-2xl tracking-tight shrink-0 hidden md:block">CodeHost</Link>
              <ChevronRight size={16} className="text-muted-foreground shrink-0 hidden md:block" />
              <span className="font-display text-lg md:text-xl truncate">{project.name}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {project.members.slice(0, 4).map((member) => (
                <Avatar key={member.id} className="w-8 h-8">
                  {member.user.avatar && <AvatarImage src={member.user.avatar} alt={member.user.name} />}
                  <AvatarFallback className="text-xs">{member.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 4 && <span className="font-mono text-xs">+{project.members.length - 4}</span>}
            </div>
          </div>
        </div>
      </nav>

      {/* Tab navigation */}
      <div className="border-b-2 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12">
          <div className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
            <Link href={`/project/${project.slug}`}
              className="flex items-center gap-2 py-4 border-b-2 border-foreground -mb-[2px] shrink-0">
              <FileCode size={18} strokeWidth={1.5} /><span className="font-mono text-sm tracking-wide">Files</span>
            </Link>
            <Link href={`/project/${project.slug}/commits`}
              className="flex items-center gap-2 py-4 text-muted-foreground hover:text-foreground shrink-0">
              <History size={18} strokeWidth={1.5} /><span className="font-mono text-sm tracking-wide">Commits</span>
            </Link>
            <Link href={`/project/${project.slug}/branches`}
              className="flex items-center gap-2 py-4 text-muted-foreground hover:text-foreground shrink-0">
              <GitBranch size={18} strokeWidth={1.5} /><span className="font-mono text-sm tracking-wide">Branches</span>
            </Link>
            <Link href={`/project/${project.slug}/members`}
              className="flex items-center gap-2 py-4 text-muted-foreground hover:text-foreground shrink-0">
              <Users size={18} strokeWidth={1.5} /><span className="font-mono text-sm tracking-wide">Members</span>
            </Link>
            <Link href={`/project/${project.slug}/settings`}
              className="flex items-center gap-2 py-4 text-muted-foreground hover:text-foreground shrink-0">
              <Settings size={18} strokeWidth={1.5} /><span className="font-mono text-sm tracking-wide">Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <p className="text-muted-foreground">{project.description || 'No project description'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/project/${project.slug}/ide`}>
              <Button size="sm" variant="outline"><Code2 size={16} className="mr-2" />Edit Online</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => singleFileInputRef.current?.click()} disabled={uploading}>
              <Upload size={16} className="mr-2" />{uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Folder size={16} className="mr-2" />{uploading ? 'Uploading...' : 'Upload Folder'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading || files.length === 0}>
              <Download size={16} className="mr-2" />{downloading ? 'Packaging...' : 'Download'}
            </Button>
            <Button size="sm" onClick={() => setShowNewFileInput(true)}>
              <Plus size={16} className="mr-2" />New File
            </Button>
          </div>
        </div>

        {/* Upload progress bar */}
        {uploading && uploadProgress.phase && (
          <div className="mb-6 border-2 border-foreground p-4 bg-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm">{uploadProgress.phase}</span>
              {uploadProgress.total > 0 && (
                <span className="font-mono text-xs text-muted-foreground">
                  {uploadProgress.total > 1 ? `${uploadProgress.current} / ${uploadProgress.total}` : ''}
                </span>
              )}
            </div>
            {uploadProgress.total > 1 && (
              <div className="h-2 bg-border-light overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-200"
                  style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
                />
              </div>
            )}
            {uploadProgress.total <= 1 && (
              <div className="h-2 bg-border-light overflow-hidden">
                <div className="h-full bg-foreground animate-pulse w-full" />
              </div>
            )}
          </div>
        )}

        {showNewFileInput && (
          <div className="mb-6 p-4 border-2 border-foreground bg-muted">
            <div className="flex items-center gap-3">
              <input autoFocus className="flex-1 px-3 py-2 font-mono text-sm border-2 border-foreground bg-white focus:outline-none"
                placeholder="Enter file path (e.g. src/index.ts or README.md)" value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') { setShowNewFileInput(false); setNewFileName(''); } }} />
              <Button size="sm" onClick={handleCreateFile}>Create</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewFileInput(false); setNewFileName(''); }}>Cancel</Button>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">Supports nested paths like src/utils/helper.ts, directories will be created automatically. Enter to confirm, Esc to cancel</p>
          </div>
        )}

        {/* File list */}
        <div className="border-2 border-foreground">
          <div className="flex items-center px-4 py-3 bg-muted border-b border-border-light">
            <div className="flex-1 font-mono text-xs tracking-widest uppercase">Name</div>
            <div className="w-40 font-mono text-xs tracking-widest uppercase text-right">Last Updated</div>
          </div>

          {files.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground mb-4">Project has no files yet</p>
              <div className="flex items-center justify-center gap-3">
                <Button size="sm" onClick={() => setShowNewFileInput(true)}>
                  <Plus size={16} className="mr-2" />Create First File
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} className="mr-2" />Upload Project Folder
                </Button>
              </div>
            </div>
          ) : (
            <FileTree files={files} projectSlug={project.slug} projectId={project.id} />
          )}
        </div>

        {/* Comments */}
        {project && <ProjectComments projectId={project.id} />}
      </main>

      {/* Paid download dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paid Download</DialogTitle>
            <DialogDescription>
              Downloading the full source code of "{project?.name}" requires payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="border-2 border-foreground p-6 text-center">
              <p className="font-display text-3xl mb-2">$9.90</p>
              <p className="text-sm text-muted-foreground">Buy once, download forever</p>
            </div>
            <div className="bg-muted border-2 border-foreground p-4">
              <p className="text-sm text-center text-muted-foreground">
                Please contact <span className="font-semibold">Hapince Technology</span> for paid download access
              </p>
              <p className="text-sm text-center text-muted-foreground mt-2">
                Email: <span className="font-mono">info@hapince.site</span> | Phone: <span className="font-mono">17300766401</span>
              </p>
            </div>
            <Button className="w-full" onClick={() => setPayDialogOpen(false)}>
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant */}
      <AiChat />
    </div>
  );
}

function FileTree({ files, projectSlug, projectId, level = 0 }: {
  files: FileItem[]; projectSlug: string; projectId: string; level?: number;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // Sort: folders first, files second, sort by name within same type
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
    if (a.type !== 'FOLDER' && b.type === 'FOLDER') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {sortedFiles.map((file) => {
        const isFolder = file.type === 'FOLDER';
        const isExpanded = expandedFolders.has(file.id);
        return (
          <div key={file.id}>
            {isFolder ? (
              <div onClick={() => toggleFolder(file.id)}
                className="flex items-center px-4 py-3 hover:bg-muted transition-colors border-b border-border-light last:border-b-0 cursor-pointer"
                style={{ paddingLeft: `${16 + level * 24}px` }}>
                <div className="flex items-center gap-3 flex-1">
                  {isExpanded ? <><ChevronDown size={14} className="text-muted-foreground" /><FolderOpen size={18} className="text-amber-500" /></>
                    : <><ChevronRight size={14} className="text-muted-foreground" /><Folder size={18} className="text-amber-500" /></>}
                  <span className="font-mono text-sm">{file.name}</span>
                </div>
                <div className="w-40 font-mono text-xs text-muted-foreground text-right">-</div>
              </div>
            ) : (
              <Link href={`/project/${projectSlug}/editor/${file.id}`}
                className="flex items-center px-4 py-3 hover:bg-muted transition-colors border-b border-border-light last:border-b-0"
                style={{ paddingLeft: `${16 + level * 24}px` }}>
                <div className="flex items-center gap-3 flex-1">
                  <span className="w-[14px]" /><File size={18} strokeWidth={1.5} />
                  <span className="font-mono text-sm">{file.name}</span>
                </div>
                <div className="w-40 font-mono text-xs text-muted-foreground text-right">
                  {file.versions?.[0] ? formatDate(file.versions[0].createdAt) : '-'}
                </div>
              </Link>
            )}
            {isFolder && isExpanded && file.children && file.children.length > 0 && (
              <FileTree files={file.children} projectSlug={projectSlug} projectId={projectId} level={level + 1} />
            )}
          </div>
        );
      })}
    </>
  );
}

function readFileAsText(file: globalThis.File): Promise<{ content: string; isBinary: boolean }> {
  return new Promise((resolve, reject) => {
    // Check if it's a binary file type
    const binaryExtensions = [
      // Images
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
      '.tiff', '.tif', '.psd', '.raw',
      // Audio/Video
      '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov',
      '.flac', '.aac', '.wmv', '.mkv',
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      // Archives
      '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz', '.whl', '.egg',
      // Fonts
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      // Executables & Binaries
      '.exe', '.dll', '.sys', '.ocx', '.lib', '.so', '.a', '.o', '.out',
      '.dylib', '.bundle', '.framework', '.bin', '.elf',
      // Build output
      '.class', '.jar', '.war', '.ear', '.pyc', '.pyo', '.pyd', '.obj', '.jad',
      // Database files
      '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb', '.frm', '.ibd', '.dbf',
      // Mobile development
      '.apk', '.aab', '.dex', '.ipa',
      // WebAssembly
      '.wasm',
      // Data formats (binary)
      '.parquet', '.avro', '.msgpack',
      // Certificates
      '.p12', '.pfx',
      // IDE
      '.suo',
    ];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isBinaryExt = binaryExtensions.includes(ext) || file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/');

    if (isBinaryExt) {
      // Read as base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // dataURL format: data:mime;base64,XXXXX
        resolve({ content: result, isBinary: true });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      // Try reading as text
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        let np = 0; const cl = Math.min(result.length, 8000);
        for (let i = 0; i < cl; i++) { const c = result.charCodeAt(i); if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) np++; }
        if (cl > 0 && np / cl > 0.1) {
          // Is binary, use base64 instead
          const reader2 = new FileReader();
          reader2.onload = () => {
            resolve({ content: reader2.result as string, isBinary: true });
          };
          reader2.onerror = reject;
          reader2.readAsDataURL(file);
          return;
        }
        resolve({ content: result, isBinary: false });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

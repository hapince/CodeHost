'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FilePlus,
  FolderPlus,
  Trash2,
  Download,
  Upload,
  X,
  Search,
  RefreshCw,
  MoreVertical,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { detectLanguage, formatBytes } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="font-mono text-sm tracking-widest uppercase text-neutral-400">
          Loading editor...
        </p>
      </div>
    ),
  }
);

const monochromeTheme = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: '1e40af', fontStyle: 'bold' },
    { token: 'string', foreground: '065f46' },
    { token: 'number', foreground: '92400e' },
    { token: 'type', foreground: '6b21a8' },
    { token: 'class', foreground: '6b21a8' },
    { token: 'function', foreground: 'b45309' },
    { token: 'variable', foreground: '000000' },
    { token: 'constant', foreground: '92400e' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#1f2937',
    'editor.lineHighlightBackground': '#f9fafb',
    'editorCursor.foreground': '#1f2937',
    'editor.selectionBackground': '#dbeafe',
    'editor.inactiveSelectionBackground': '#f3f4f6',
    'editorLineNumber.foreground': '#9ca3af',
    'editorLineNumber.activeForeground': '#1f2937',
    'editorIndentGuide.background': '#e5e7eb',
    'editorIndentGuide.activeBackground': '#9ca3af',
    'editorWhitespace.foreground': '#e5e7eb',
    'editorBracketMatch.background': '#dbeafe',
    'editorBracketMatch.border': '#3b82f6',
  },
};

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
    author: { id: string; name: string };
  }>;
}

interface OpenTab {
  id: string;
  name: string;
  path: string;
  content: string;
  originalContent: string;
  language: string;
  hasChanges: boolean;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function IDEPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [flatFiles, setFlatFiles] = useState<FileItem[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParentPath, setNewItemParentPath] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, phase: '' });
  const [downloading, setDownloading] = useState(false);

  const editorRef = useRef<any>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;

  // Load project and files
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
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProject(data);
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
      if (res.ok) {
        setFiles(data);
        // Expand all top-level folders
        const topFolders = new Set<string>();
        data.forEach((f: FileItem) => {
          if (f.type === 'FOLDER') topFolders.add(f.id);
        });
        setExpandedFolders((prev) => new Set([...Array.from(prev), ...Array.from(topFolders)]));

        // Build flat file list
        const flat: FileItem[] = [];
        const flatten = (items: FileItem[]) => {
          items.forEach((item) => {
            flat.push(item);
            if (item.children) flatten(item.children);
          });
        };
        flatten(data);
        setFlatFiles(flat);
      }
    } catch (error) {
      console.error('Failed to get files:', error);
    }
  };

  useEffect(() => {
    if (project?.id) fetchFiles();
  }, [project?.id]);

  // Open file
  const openFile = async (file: FileItem) => {
    if (file.type === 'FOLDER') {
      toggleFolder(file.id);
      return;
    }

    // Already open, switch to it
    const existing = openTabs.find((t) => t.id === file.id);
    if (existing) {
      setActiveTabId(file.id);
      return;
    }

    // Get file content
    try {
      const res = await fetch(
        `/api/projects/${project!.id}/files/${file.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        const language = detectLanguage(file.name);
        const newTab: OpenTab = {
          id: file.id,
          name: file.name,
          path: file.path,
          content: data.content || '',
          originalContent: data.content || '',
          language,
          hasChanges: false,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(file.id);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  // Close tab
  const closeTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        const idx = prev.findIndex((t) => t.id === tabId);
        const nextTab = newTabs[Math.min(idx, newTabs.length - 1)];
        setActiveTabId(nextTab?.id || null);
      }
      return newTabs;
    });
  };

  // Toggle folder expand
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Editor content change
  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (!activeTabId) return;
      const newContent = value || '';
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, content: newContent, hasChanges: newContent !== t.originalContent }
            : t
        )
      );
    },
    [activeTabId]
  );

  // Save file
  const handleSave = async () => {
    if (!activeTab || !activeTab.hasChanges) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${project!.id}/files/${activeTab.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: activeTab.content }),
        }
      );
      if (res.ok) {
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? { ...t, originalContent: t.content, hasChanges: false }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Monaco editor mount
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('ide-theme', monochromeTheme);
    monaco.editor.setTheme('ide-theme');
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Create new file
  const createNewFile = async (type: 'FILE' | 'FOLDER') => {
    if (!newItemName.trim() || !project) return;

    const parentPath = newItemParentPath;
    const path = parentPath ? `${parentPath}/${newItemName}` : newItemName;

    // Find parentId
    let parentId: string | undefined;
    if (parentPath) {
      const parentFile = flatFiles.find(
        (f) => f.path === parentPath && f.type === 'FOLDER'
      );
      parentId = parentFile?.id;
    }

    try {
      const res = await fetch(`/api/projects/${project.id}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newItemName,
          path,
          type,
          content: type === 'FILE' ? '' : undefined,
          parentId,
        }),
      });
      if (res.ok) {
        await fetchFiles();
        setNewItemName('');
        setNewItemParentPath('');
        setShowNewFileDialog(false);
        setShowNewFolderDialog(false);
      }
    } catch (error) {
      console.error('Create failed:', error);
    }
  };

  // Delete file
  const deleteFile = async (file: FileItem) => {
    if (!project) return;
    const confirmed = await showConfirm({ title: 'Confirm Delete', message: `Are you sure you want to delete ${file.name}?`, variant: 'danger' });
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/projects/${project.id}/files/${file.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        // Close corresponding tab
        closeTab(file.id);
        await fetchFiles();
      } else {
        const data = await res.json();
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
    setContextMenu(null);
  };

  // Upload entire project
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
        const skipPatterns = [
          'node_modules/', '.git/', '.next/', '__pycache__/',
          '.DS_Store', 'Thumbs.db', '.env.local',
          'dist/', 'build/', '.cache/', 'target/',
        ];
        if (skipPatterns.some((p) => cleanPath.includes(p))) continue;
        if (f.size > 5 * 1024 * 1024) continue;
        validFiles.push({ file: f, cleanPath });
      }

      if (validFiles.length === 0) {
        showToast('No uploadable files found', 'warning');
        setUploading(false);
        setUploadProgress({ current: 0, total: 0, phase: '' });
        return;
      }

      const totalFiles = validFiles.length;
      setUploadProgress({ current: 0, total: totalFiles, phase: 'Reading files...' });

      const fileArray: { path: string; content: string; type: string; isBinary?: boolean }[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const { file, cleanPath } = validFiles[i];
        setUploadProgress({ current: i + 1, total: totalFiles, phase: `Reading files (${i + 1}/${totalFiles})` });
        try {
          const { content, isBinary } = await readFileAsText(file);
          fileArray.push({ path: cleanPath, content, type: 'FILE', isBinary });
        } catch {
          continue;
        }
      }

      if (fileArray.length === 0) {
        showToast('No uploadable files found', 'warning');
        setUploading(false);
        setUploadProgress({ current: 0, total: 0, phase: '' });
        return;
      }

      setUploadProgress({ current: 0, total: 1, phase: `Uploading ${fileArray.length} files...` });
      const res = await fetch(`/api/projects/${project.id}/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ files: fileArray }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Upload successful! ${data.message}`, 'success');
        await fetchFiles();
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, phase: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload single/multiple files
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
        if (f.size > 50 * 1024 * 1024) continue;
        setUploadProgress({ current: i + 1, total: totalFiles, phase: `Reading files (${i + 1}/${totalFiles})` });
        try {
          const { content, isBinary } = await readFileAsText(f);
          fileArray.push({ path: f.name, content, type: 'FILE', isBinary });
        } catch { continue; }
      }
      if (fileArray.length === 0) { showToast('No uploadable files', 'warning'); setUploading(false); setUploadProgress({ current: 0, total: 0, phase: '' }); return; }

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

  // Download project
  const handleDownload = async () => {
    if (!project) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Download failed', 'error');
        return;
      }

      // Use JSZip to package on the client
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const file of data.files) {
        if (file.type === 'FILE') {
          if (file.content && file.content.startsWith('data:')) {
            const base64Data = file.content.split(',')[1];
            if (base64Data) zip.file(file.path, base64Data, { base64: true });
          } else {
            zip.file(file.path, file.content || '');
          }
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.projectSlug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // File search filter
  const filteredFiles = searchQuery
    ? flatFiles.filter(
        (f) =>
          f.type === 'FILE' &&
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  // Sidebar drag resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, startWidth + e.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <p className="font-mono text-sm tracking-widest uppercase text-neutral-400">
          Loading...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
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
    <div className="h-screen flex flex-col bg-white overflow-hidden" onClick={() => setContextMenu(null)}>
      {/* Top toolbar */}
      <header className="h-12 border-b border-neutral-200 flex items-center px-3 gap-2 bg-neutral-50 flex-shrink-0">
        <Link
          href={`/project/${params.slug}`}
          className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
          title="Back to project"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="h-5 w-px bg-neutral-300" />

        <span className="font-mono text-sm font-medium text-neutral-700 truncate max-w-[200px]">
          {project.name}
        </span>

        <div className="flex-1" />

        {/* Upload buttons */}
        <input
          ref={singleFileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileUpload}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          // @ts-ignore - webkitdirectory is non-standard
          webkitdirectory=""
          multiple
          onChange={handleProjectUpload}
        />
        <button
          onClick={() => singleFileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono hover:bg-neutral-200 rounded transition-colors disabled:opacity-50"
          title="Upload files"
        >
          <Upload size={14} />
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono hover:bg-neutral-200 rounded transition-colors disabled:opacity-50"
          title="Upload project folder"
        >
          <Folder size={14} />
          {uploading && uploadProgress.total > 1
            ? `${uploadProgress.current}/${uploadProgress.total}`
            : uploading ? 'Uploading...' : 'Upload Folder'}
        </button>

        {/* Upload progress overlay */}
        {uploading && uploadProgress.phase && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-neutral-300 px-4 py-2 z-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-neutral-600">{uploadProgress.phase}</span>
            </div>
            <div className="h-1.5 bg-neutral-200 overflow-hidden rounded-full">
              <div
                className={`h-full bg-neutral-800 transition-all duration-200 ${uploadProgress.total <= 1 ? 'animate-pulse w-full' : ''}`}
                style={uploadProgress.total > 1 ? { width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` } : undefined}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono hover:bg-neutral-200 rounded transition-colors disabled:opacity-50"
          title="Download project as ZIP"
        >
          <Download size={14} />
          {downloading ? 'Packaging...' : 'Download Project'}
        </button>

        <div className="h-5 w-px bg-neutral-300" />

        <button
          onClick={handleSave}
          disabled={!activeTab?.hasChanges || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-neutral-800 text-white rounded hover:bg-neutral-700 transition-colors disabled:opacity-30"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <aside
              className="flex flex-col border-r border-neutral-200 bg-neutral-50 flex-shrink-0"
              style={{ width: sidebarWidth }}
            >
              {/* Sidebar header */}
              <div className="h-9 flex items-center justify-between px-3 border-b border-neutral-200 flex-shrink-0">
                <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500 font-medium">
                  Explorer
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      setNewItemParentPath('');
                      setNewItemName('');
                      setShowNewFileDialog(true);
                    }}
                    className="p-1 hover:bg-neutral-200 rounded"
                    title="New File"
                  >
                    <FilePlus size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setNewItemParentPath('');
                      setNewItemName('');
                      setShowNewFolderDialog(true);
                    }}
                    className="p-1 hover:bg-neutral-200 rounded"
                    title="New Folder"
                  >
                    <FolderPlus size={14} />
                  </button>
                  <button
                    onClick={fetchFiles}
                    className="p-1 hover:bg-neutral-200 rounded"
                    title="Refresh"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 hover:bg-neutral-200 rounded"
                    title="Collapse Sidebar"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                </div>
              </div>

              {/* New file/folder inline input */}
              {(showNewFileDialog || showNewFolderDialog) && (
                <div className="px-2 py-2 border-b border-neutral-200 bg-blue-50">
                  <div className="flex items-center gap-1 mb-1">
                    {showNewFileDialog ? (
                      <File size={12} className="text-neutral-500" />
                    ) : (
                      <Folder size={12} className="text-neutral-500" />
                    )}
                    <span className="text-[11px] font-mono text-neutral-600">
                      {showNewFileDialog ? 'New File' : 'New Folder'}
                    </span>
                  </div>
                  <input
                    autoFocus
                    className="w-full px-2 py-1 text-xs font-mono border border-neutral-300 rounded bg-white focus:outline-none focus:border-blue-500"
                    placeholder={showNewFileDialog ? 'Filename (e.g. src/index.ts)' : 'Folder name (e.g. src/utils)'}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // If contains / then parse path
                        const parts = newItemName.split('/');
                        if (parts.length > 1) {
                          setNewItemName(parts[parts.length - 1]);
                          setNewItemParentPath(parts.slice(0, -1).join('/'));
                        }
                        createNewFile(showNewFileDialog ? 'FILE' : 'FOLDER');
                      }
                      if (e.key === 'Escape') {
                        setShowNewFileDialog(false);
                        setShowNewFolderDialog(false);
                        setNewItemName('');
                      }
                    }}
                  />
                  <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                    Supports paths like src/utils/helper.ts, Enter to confirm, Esc to cancel
                  </p>
                </div>
              )}

              {/* File tree */}
              <div className="flex-1 overflow-auto py-1 select-none">
                {files.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-neutral-400 font-mono mb-3">No files</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-mono text-blue-600 hover:text-blue-800 underline"
                    >
                      Upload Project
                    </button>
                  </div>
                ) : (
                  <FileTreeView
                    files={files}
                    expandedFolders={expandedFolders}
                    activeTabId={activeTabId}
                    onFileClick={openFile}
                    onToggleFolder={toggleFolder}
                    onContextMenu={handleContextMenu}
                    level={0}
                  />
                )}
              </div>
            </aside>

            {/* Drag resize handle */}
            <div
              ref={resizeRef}
              className="w-1 cursor-col-resize hover:bg-blue-400 transition-colors flex-shrink-0"
              onMouseDown={handleResizeStart}
            />
          </>
        )}

        {/* Main editor area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Show expand button when sidebar is collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-14 left-1 z-10 p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200"
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}

          {/* Tab bar */}
          {openTabs.length > 0 && (
            <div className="h-9 flex items-center bg-neutral-100 border-b border-neutral-200 overflow-x-auto flex-shrink-0">
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 px-3 h-full cursor-pointer border-r border-neutral-200 min-w-0 ${
                    tab.id === activeTabId
                      ? 'bg-white border-t-2 border-t-blue-500 -mb-px'
                      : 'hover:bg-neutral-50'
                  }`}
                  style={{ maxWidth: 180 }}
                >
                  <FileIcon name={tab.name} size={13} />
                  <span className="font-mono text-xs truncate flex-1">{tab.name}</span>
                  {tab.hasChanges && (
                    <span className="w-2 h-2 rounded-full bg-neutral-400 flex-shrink-0" />
                  )}
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className="p-0.5 hover:bg-neutral-200 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Breadcrumbs */}
          {activeTab && (
            <div className="h-7 flex items-center px-3 bg-white border-b border-neutral-100 flex-shrink-0">
              <span className="font-mono text-[11px] text-neutral-500">{activeTab.path}</span>
            </div>
          )}

          {/* Editor / Welcome page */}
          <div className="flex-1 min-h-0">
            {activeTab ? (
              activeTab.content.startsWith('data:image/') ? (
                /* Image preview */
                <div className="h-full flex flex-col items-center justify-center bg-neutral-50 overflow-auto p-8">
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 max-w-full">
                    <div className="flex items-center gap-2 mb-4 text-sm text-neutral-500 font-mono">
                      <File size={14} />
                      <span>{activeTab.name}</span>
                      <span className="text-neutral-300">·</span>
                      <span>Image Preview</span>
                    </div>
                    <div className="flex items-center justify-center" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                      <img
                        src={activeTab.content}
                        alt={activeTab.name}
                        className="max-w-full max-h-full object-contain rounded border border-neutral-100"
                        style={{ imageRendering: 'auto' }}
                      />
                    </div>
                  </div>
                </div>
              ) : activeTab.content.startsWith('data:') ? (
                /* Other binary files */
                <div className="h-full flex items-center justify-center bg-neutral-50">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-neutral-200 rounded-xl flex items-center justify-center">
                      <File size={28} className="text-neutral-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-700 mb-1">{activeTab.name}</h3>
                    <p className="text-sm text-neutral-500 font-mono mb-4">Binary file, cannot be displayed in editor</p>
                    <p className="text-xs text-neutral-400 font-mono">
                      Size: {formatBytes(Math.round(activeTab.content.length * 0.75))}
                    </p>
                  </div>
                </div>
              ) : (
              <MonacoEditor
                key={activeTab.id}
                language={activeTab.language}
                value={activeTab.content}
                onChange={handleContentChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 14,
                  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                  lineNumbers: 'on',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  renderWhitespace: 'selection',
                  cursorBlinking: 'smooth',
                  cursorStyle: 'line',
                  cursorWidth: 2,
                  smoothScrolling: true,
                  padding: { top: 8 },
                  bracketPairColorization: { enabled: true },
                  guides: { indentation: true, bracketPairs: true },
                  suggest: { showMethods: true, showFunctions: true },
                }}
              />
              )
            ) : (
              <WelcomePage
                projectName={project.name}
                fileCount={flatFiles.filter((f) => f.type === 'FILE').length}
                onUpload={() => fileInputRef.current?.click()}
                onNewFile={() => {
                  setNewItemParentPath('');
                  setNewItemName('');
                  setShowNewFileDialog(true);
                }}
              />
            )}
          </div>

          {/* Status bar */}
          <footer className="h-6 flex items-center justify-between px-3 bg-neutral-800 text-neutral-300 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <GitBranch size={12} />
                <span className="font-mono text-[11px]">main</span>
              </div>
              {activeTab && (
                <>
                  <span className="font-mono text-[11px]">
                    Line {cursorPosition.line}, Col {cursorPosition.column}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {activeTab.language.toUpperCase()}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              {activeTab && (
                <span className="font-mono text-[11px] text-neutral-500">
                  {formatBytes(activeTab.content.length)}
                </span>
              )}
              <span className="font-mono text-[11px] text-neutral-500">
                {flatFiles.filter((f) => f.type === 'FILE').length} files
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file.type === 'FOLDER' && (
            <>
              <button
                className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-neutral-100 flex items-center gap-2"
                onClick={() => {
                  setNewItemParentPath(contextMenu.file.path);
                  setNewItemName('');
                  setShowNewFileDialog(true);
                  setContextMenu(null);
                }}
              >
                <FilePlus size={12} /> New File
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-neutral-100 flex items-center gap-2"
                onClick={() => {
                  setNewItemParentPath(contextMenu.file.path);
                  setNewItemName('');
                  setShowNewFolderDialog(true);
                  setContextMenu(null);
                }}
              >
                <FolderPlus size={12} /> New Subfolder
              </button>
              <div className="border-t border-neutral-100 my-1" />
            </>
          )}
          <button
            className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => deleteFile(contextMenu.file)}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Quick file search (Ctrl+P) */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[400px] overflow-hidden border border-neutral-200">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
              <Search size={16} className="text-neutral-400" />
              <input
                autoFocus
                className="flex-1 text-sm font-mono outline-none bg-transparent"
                placeholder="Search file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSearch(false);
                    setSearchQuery('');
                  }
                  if (e.key === 'Enter' && filteredFiles.length > 0) {
                    openFile(filteredFiles[0]);
                    setShowSearch(false);
                    setSearchQuery('');
                  }
                }}
              />
            </div>
            <div className="overflow-auto max-h-[340px]">
              {searchQuery &&
                filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    className="w-full text-left px-4 py-2 hover:bg-neutral-100 flex items-center gap-2"
                    onClick={() => {
                      openFile(file);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  >
                    <FileIcon name={file.name} size={14} />
                    <span className="font-mono text-sm">{file.name}</span>
                    <span className="font-mono text-xs text-neutral-400 ml-auto truncate max-w-[200px]">
                      {file.path}
                    </span>
                  </button>
                ))}
              {searchQuery && filteredFiles.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-neutral-400 font-mono">
                  No matching files found
                </p>
              )}
              {!searchQuery && (
                <p className="px-4 py-8 text-center text-xs text-neutral-400 font-mono">
                  Type file name to start searching
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// File tree view component
function FileTreeView({
  files,
  expandedFolders,
  activeTabId,
  onFileClick,
  onToggleFolder,
  onContextMenu,
  level,
}: {
  files: FileItem[];
  expandedFolders: Set<string>;
  activeTabId: string | null;
  onFileClick: (file: FileItem) => void;
  onToggleFolder: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void;
  level: number;
}) {
  return (
    <>
      {files.map((file) => {
        const isFolder = file.type === 'FOLDER';
        const isExpanded = expandedFolders.has(file.id);
        const isActive = file.id === activeTabId;

        return (
          <div key={file.id}>
            <div
              className={`flex items-center gap-1 px-2 py-[3px] cursor-pointer select-none hover:bg-neutral-200/60 ${
                isActive ? 'bg-blue-100 text-blue-800' : 'text-neutral-700'
              }`}
              style={{ paddingLeft: `${8 + level * 16}px` }}
              onClick={() => (isFolder ? onToggleFolder(file.id) : onFileClick(file))}
              onContextMenu={(e) => onContextMenu(e, file)}
              onDoubleClick={() => !isFolder && onFileClick(file)}
            >
              {isFolder ? (
                <>
                  <ChevronRight
                    size={12}
                    className={`text-neutral-400 transition-transform flex-shrink-0 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  {isExpanded ? (
                    <FolderOpen size={14} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <Folder size={14} className="text-amber-500 flex-shrink-0" />
                  )}
                </>
              ) : (
                <>
                  <span className="w-3 flex-shrink-0" />
                  <FileIcon name={file.name} size={14} />
                </>
              )}
              <span className="font-mono text-[12px] truncate">{file.name}</span>
            </div>
            {isFolder && isExpanded && file.children && file.children.length > 0 && (
              <FileTreeView
                files={file.children}
                expandedFolders={expandedFolders}
                activeTabId={activeTabId}
                onFileClick={onFileClick}
                onToggleFolder={onToggleFolder}
                onContextMenu={onContextMenu}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// File icon component - display different colors based on extension
function FileIcon({ name, size = 14 }: { name: string; size?: number }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const colorMap: Record<string, string> = {
    ts: 'text-blue-600',
    tsx: 'text-blue-600',
    js: 'text-yellow-600',
    jsx: 'text-yellow-600',
    py: 'text-green-600',
    json: 'text-amber-600',
    md: 'text-neutral-600',
    css: 'text-purple-600',
    scss: 'text-pink-600',
    html: 'text-orange-600',
    vue: 'text-emerald-600',
    go: 'text-cyan-600',
    rs: 'text-orange-700',
    java: 'text-red-600',
    yaml: 'text-red-400',
    yml: 'text-red-400',
    sql: 'text-blue-500',
    sh: 'text-green-500',
  };
  const color = colorMap[ext] || 'text-neutral-400';

  return <File size={size} className={`${color} flex-shrink-0`} />;
}

// Welcome page
function WelcomePage({
  projectName,
  fileCount,
  onUpload,
  onNewFile,
}: {
  projectName: string;
  fileCount: number;
  onUpload: () => void;
  onNewFile: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center bg-neutral-50">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-neutral-800 mb-2">{projectName}</h2>
        <p className="text-sm text-neutral-500 mb-8">
          {fileCount > 0
            ? `Project contains ${fileCount} files, click the file tree on the left to open and edit`
            : 'Project has no files yet, start creating or uploading'}
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onNewFile}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 text-white text-sm font-mono rounded-lg hover:bg-neutral-700 transition-colors"
          >
            <FilePlus size={16} />
            New File
          </button>
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-neutral-300 text-neutral-700 text-sm font-mono rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <Upload size={16} />
            Upload Project
          </button>
        </div>

        <div className="mt-8 space-y-2 text-xs text-neutral-400 font-mono">
          <p>Ctrl+S to save · Ctrl+P quick file search</p>
          <p>Right-click files/folders to show action menu</p>
        </div>
      </div>
    </div>
  );
}

// Helper function: read file content (supports text and binary)
function readFileAsText(file: globalThis.File): Promise<{ content: string; isBinary: boolean }> {
  return new Promise((resolve, reject) => {
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
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ content: reader.result as string, isBinary: true });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        let nonPrintable = 0;
        const checkLength = Math.min(result.length, 8000);
        for (let i = 0; i < checkLength; i++) {
          const code = result.charCodeAt(i);
          if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
            nonPrintable++;
          }
        }
        if (checkLength > 0 && nonPrintable / checkLength > 0.1) {
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

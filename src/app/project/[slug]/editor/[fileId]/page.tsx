'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  ChevronRight,
  Users,
  GitBranch,
} from 'lucide-react';
import { Button, Avatar, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { detectLanguage } from '@/lib/utils';

// Dynamically load Monaco Editor
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
          Loading editor...
        </p>
      </div>
    ),
  }
);

interface FileData {
  id: string;
  name: string;
  path: string;
  type: string;
  content: string;
  versions: Array<{
    id: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
}

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  cursorColor: string;
  cursorPosition?: { line: number; column: number };
}

// Minimalist Monochrome editor theme
const monochromeTheme = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '525252', fontStyle: 'italic' },
    { token: 'keyword', foreground: '000000', fontStyle: 'bold' },
    { token: 'string', foreground: '000000' },
    { token: 'number', foreground: '000000' },
    { token: 'type', foreground: '000000' },
    { token: 'class', foreground: '000000' },
    { token: 'function', foreground: '000000' },
    { token: 'variable', foreground: '000000' },
    { token: 'constant', foreground: '000000' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#000000',
    'editor.lineHighlightBackground': '#F5F5F5',
    'editorCursor.foreground': '#000000',
    'editor.selectionBackground': '#E5E5E5',
    'editor.inactiveSelectionBackground': '#F0F0F0',
    'editorLineNumber.foreground': '#525252',
    'editorLineNumber.activeForeground': '#000000',
    'editorIndentGuide.background': '#E5E5E5',
    'editorIndentGuide.activeBackground': '#000000',
    'editorWhitespace.foreground': '#E5E5E5',
    'editorBracketMatch.background': '#E5E5E5',
    'editorBracketMatch.border': '#000000',
  },
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const { token, user, isAuthenticated, _hasHydrated } = useAuthStore();
  const [file, setFile] = useState<FileData | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [onlineUsers] = useState<OnlineUser[]>([]);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchFile();
  }, [_hasHydrated, isAuthenticated, params.fileId]);

  const fetchFile = async () => {
    try {
      // Get project by slug
      const projectRes = await fetch(`/api/projects/by-slug/${params.slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!projectRes.ok) {
        setLoading(false);
        return;
      }
      const project = await projectRes.json();

      const res = await fetch(
        `/api/projects/${project.id}/files/${params.fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setFile(data);
        setContent(data.content || '');
        setOriginalContent(data.content || '');
      }
    } catch (error) {
      console.error('Failed to get file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setHasChanges(newContent !== originalContent);
  }, [originalContent]);

  const handleSave = async () => {
    if (!file || !hasChanges) return;

    setSaving(true);
    try {
      const projectRes = await fetch(`/api/projects/by-slug/${params.slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!projectRes.ok) return;
      const project = await projectRes.json();

      const res = await fetch(
        `/api/projects/${project.id}/files/${file.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (res.ok) {
        setOriginalContent(content);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define custom theme
    monaco.editor.defineTheme('minimalist-monochrome', monochromeTheme);
    monaco.editor.setTheme('minimalist-monochrome');

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Shortcut: Ctrl+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, hasChanges]);

  if (!_hasHydrated || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
          Loading...
        </p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4">File does not exist</h1>
          <Link href={`/project/${params.slug}`}>
            <Button>Back to Project</Button>
          </Link>
        </div>
      </div>
    );
  }

  const language = detectLanguage(file.name);

  return (
    <div className="h-screen flex flex-col">
      {/* Top navigation */}
      <header className="border-b-4 border-foreground px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${params.slug}`} className="hover:opacity-70">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </Link>
            <span className="font-display text-xl tracking-tight">
              {params.slug}
            </span>
            <ChevronRight size={16} className="text-muted-foreground" />
            <span className="font-mono text-sm">{file.path}</span>
            {hasChanges && (
              <span className="w-2 h-2 bg-foreground rounded-full" />
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Online users */}
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                {onlineUsers.map((u) => (
                  <Avatar key={u.id} className="w-6 h-6">
                    <AvatarFallback
                      className="text-[10px]"
                      style={{ backgroundColor: u.cursorColor }}
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* Editor area */}
      <div className="flex-1 relative texture-grid">
        {content.startsWith('data:image/') ? (
          /* Image preview */
          <div className="h-full flex flex-col items-center justify-center overflow-auto p-8">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 max-w-full">
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground font-mono">
                <span>Image Preview</span>
                <span>·</span>
                <span>{file.name}</span>
              </div>
              <div className="flex items-center justify-center" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                <img
                  src={content}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded border border-neutral-100"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>
          </div>
        ) : content.startsWith('data:') ? (
          /* Other binary files */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-xl flex items-center justify-center">
                <ChevronRight size={28} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{file.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">Binary file, cannot be displayed in editor</p>
            </div>
          </div>
        ) : (
          <MonacoEditor
            language={language}
            value={content}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: '"JetBrains Mono", monospace',
              lineNumbers: 'on',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              renderWhitespace: 'selection',
              cursorBlinking: 'solid',
              cursorStyle: 'line',
              cursorWidth: 2,
              smoothScrolling: true,
              padding: { top: 16 },
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <footer className="border-t-2 border-foreground px-6 py-3 flex items-center justify-between bg-muted">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <GitBranch size={14} strokeWidth={1.5} />
            <span className="font-mono text-xs tracking-widest uppercase">
              main
            </span>
          </div>
          <span className="font-mono text-xs">
            Line {cursorPosition.line}, Col {cursorPosition.column}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {language.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted-foreground">
            {content.length} chars
          </span>
          {file.versions[0] && (
            <span className="font-mono text-xs text-muted-foreground">
              Last edited by: {file.versions[0].author.name}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

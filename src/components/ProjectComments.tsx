'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Avatar, AvatarImage, AvatarFallback, Textarea } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';

interface CommentAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

interface CommentReply {
  id: string;
  content: string;
  status?: string;
  createdAt: string;
  author: CommentAuthor;
}

interface Comment {
  id: string;
  content: string;
  status?: string;
  createdAt: string;
  author: CommentAuthor;
  replies: CommentReply[];
}

interface Props {
  projectId: string;
}

export default function ProjectComments({ projectId }: Props) {
  const { token, isAuthenticated, user } = useAuthStore();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
  }, [projectId]);

  const fetchComments = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${projectId}/comments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to get comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !token) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        setNewComment('');
        await fetchComments();
        showToast('Comment submitted, pending admin review before display', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to post comment', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !token) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });

      if (res.ok) {
        setReplyContent('');
        setReplyingTo(null);
        setExpandedReplies((prev) => new Set(prev).add(parentId));
        await fetchComments();
      } else {
        const data = await res.json();
        showToast(data.error || 'Reply failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    return date.toLocaleDateString('en-US');
  };

  return (
    <div className="mt-12 border-t-2 border-foreground pt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare size={22} strokeWidth={1.5} />
        <h2 className="font-display text-2xl tracking-tight">
          Discussion ({comments.length})
        </h2>
      </div>

      {/* Post comment */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="flex gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="text-xs">
                {user?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts or ask a question..."
                className="min-h-[80px] mb-2"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                  <Send size={14} className="mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 border-2 border-dashed border-border-light text-center text-muted-foreground">
          <a href="/login" className="underline font-semibold">Log in</a> to post comments
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <p className="text-center text-muted-foreground font-mono text-sm py-8">Loading comments...</p>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border-light">
          <MessageSquare size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No comments yet. Be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-border-light border-2 border-foreground">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4">
              {/* Main comment */}
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 shrink-0">
                  {comment.author.avatar && <AvatarImage src={comment.author.avatar} alt={comment.author.name} />}
                  <AvatarFallback className="text-xs">
                    {comment.author.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                  {comment.status === 'PENDING' && comment.author.id === user?.id && (
                    <span className="inline-block text-xs mt-1 px-2 py-0.5 bg-yellow-100 border border-yellow-500 text-yellow-700">Pending Review</span>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {isAuthenticated && (
                      <button
                        onClick={() => {
                          setReplyingTo(replyingTo === comment.id ? null : comment.id);
                          setReplyContent('');
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Reply size={12} /> Reply
                      </button>
                    )}
                    {comment.replies.length > 0 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {expandedReplies.has(comment.id) ? (
                          <><ChevronUp size={12} /> Collapse {comment.replies.length} replies</>
                        ) : (
                          <><ChevronDown size={12} /> View {comment.replies.length} replies</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="ml-11 mt-3 flex gap-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${comment.author.name}...`}
                    className="min-h-[60px] text-sm flex-1"
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={() => handleSubmitReply(comment.id)} disabled={submitting || !replyContent.trim()}>
                      <Send size={12} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyContent(''); }}>
                      <span className="text-xs">Cancel</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Reply list */}
              {expandedReplies.has(comment.id) && comment.replies.length > 0 && (
                <div className="ml-11 mt-3 space-y-3 pl-4 border-l-2 border-border-light">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <Avatar className="w-6 h-6 shrink-0">
                        {reply.author.avatar && <AvatarImage src={reply.author.avatar} alt={reply.author.name} />}
                        <AvatarFallback className="text-[10px]">
                          {reply.author.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-xs">{reply.author.name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(reply.createdAt)}</span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

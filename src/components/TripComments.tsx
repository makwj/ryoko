"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface CommentRecord {
  id: string;
  trip_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { name?: string | null; avatar_url?: string | null };
}

export default function TripComments({ tripId, isOpen, onClose }: { tripId: string; isOpen: boolean; onClose: () => void }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const { data } = await supabase
        .from('trip_comments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      
      if (data) {
        // Fetch author profiles separately
        const commentsWithAuthors = await Promise.all(
          data.map(async (comment: any) => {
            const { data: authorData } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', comment.user_id)
              .single();
            return { ...comment, author: authorData || null };
          })
        );
        setComments(commentsWithAuthors);
      } else {
        setComments([]);
      }
    };
    load();
    const channel = supabase
      .channel(`trip-comments-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_comments', filter: `trip_id=eq.${tripId}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newComment = payload.new as any;
          // Fetch author for new comment
          const { data: authorData } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', newComment.user_id)
            .single();
          setComments((prev) => [...prev, { ...newComment, author: authorData || null }]);
        } else if (payload.eventType === 'DELETE') {
          setComments((prev) => prev.filter(c => c.id !== (payload.old as any).id));
        } else if (payload.eventType === 'UPDATE') {
          const updatedComment = payload.new as any;
          // Fetch author for updated comment
          const { data: authorData } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', updatedComment.user_id)
            .single();
          setComments((prev) => prev.map(c => c.id === updatedComment.id ? { ...updatedComment, author: authorData || null } : c));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, tripId]);

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from('trip_comments').insert({ trip_id: tripId, user_id: userData.user.id, content: content.trim() });
      setContent("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {comment.author?.avatar_url ? (
                <img src={comment.author.avatar_url} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{comment.author?.name || 'User'}</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.content}</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(comment.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div>
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a58] resize-none text-sm"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          disabled={loading || !content.trim()}
          className="mt-2 bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}


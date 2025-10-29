"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

interface CommentRecord {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { name?: string | null; avatar_url?: string | null };
}

export default function PostComments({ postId, isOpen, onClose }: { postId: string; isOpen: boolean; onClose: () => void }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('*, author:profiles(name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      setComments((data as any[]) || []);
    };
    load();
    const channel = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setComments((prev) => [...prev, payload.new as any]);
        } else if (payload.eventType === 'DELETE') {
          setComments((prev) => prev.filter(c => c.id !== (payload.old as any).id));
        } else if (payload.eventType === 'UPDATE') {
          setComments((prev) => prev.map(c => c.id === (payload.new as any).id ? (payload.new as any) : c));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, postId]);

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from('post_comments').insert({ post_id: postId, user_id: userData.user.id, content: content.trim() });
      setContent("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-lg sm:shadow-lg p-4 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Comments</h3>
          <button className="cursor-pointer" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3 mb-4">
          {comments.length === 0 ? (
            <div className="text-gray-500 text-sm">Be the first to comment.</div>
          ) : comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div>
                <div className="text-sm font-medium">{c.author?.name || 'User'} <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span></div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3">
          <textarea ref={inputRef} className="w-full border border-gray-300 rounded-md p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a58]" rows={3} placeholder="Write a comment..." value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded-md bg-[#ff5a58] text-white disabled:opacity-60" onClick={submit} disabled={loading}>Comment</button>
          </div>
        </div>
      </div>
    </div>
  );
}



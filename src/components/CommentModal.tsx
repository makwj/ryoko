"use client";

import { useState, useEffect } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  ideaId: string;
  ideaTitle: string;
  comments: IdeaComment[];
  participants: { id: string; name: string; avatar_url?: string }[];
  onCommentsUpdated: () => void;
}

interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function CommentModal({ 
  open, 
  onClose, 
  ideaId,
  ideaTitle,
  comments,
  participants,
  onCommentsUpdated 
}: CommentModalProps) {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      toast.success('Comment added!');
      setNewComment('');
      onCommentsUpdated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('idea_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted!');
      onCommentsUpdated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-gray-500" />
            Comments for "{ideaTitle}"
          </DialogTitle>
          <DialogDescription>
            View and add comments for this idea
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-form">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => {
                const commenter = participants.find(p => p.id === comment.user_id);
                const isOwnComment = user?.id === comment.user_id;

                return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-gray-600">
                        {commenter?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-dark">
                            {commenter?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                      {isOwnComment && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-600 hover:text-red-800 mt-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment */}
          <div className="border-t p-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">
                  {user?.email?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full resize-none"
                  rows={2}
                />
              </div>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || loading}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

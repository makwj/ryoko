"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bookmark, MessageCircle, MoreVertical, Edit, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import AvatarStack from "@/components/ui/avatar-stack";

export interface PostImage {
  id: string;
  image_path: string;
  width?: number | null;
  height?: number | null;
  order_index: number;
}

export interface PostRecord {
  id: string;
  author_id: string;
  content: string;
  country_code?: string | null;
  country_name?: string | null;
  is_featured: boolean;
  trip_id?: string | null;
  created_at: string;
  author?: {
    name?: string | null;
    avatar_url?: string | null;
  };
  images?: PostImage[];
  like_count?: number;
  dislike_count?: number;
  comment_count?: number;
  bookmarked?: boolean;
}

interface CommentRecord {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { name?: string | null; avatar_url?: string | null };
}

interface PostCardProps {
  post: PostRecord;
  onUserClick?: (userId: string) => void;
  onEdit?: (post: PostRecord) => void;
  onDelete?: (postId: string) => void;
}

// Image Carousel Component
function ImageCarousel({ images }: { images: PostImage[] }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const imageUrls = images.map(img => 
    supabase.storage.from('post-images').getPublicUrl(img.image_path).data.publicUrl
  );

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      } else if (e.key === 'ArrowRight' && selectedImageIndex < images.length - 1) {
        setSelectedImageIndex(selectedImageIndex + 1);
      } else if (e.key === 'ArrowLeft' && selectedImageIndex > 0) {
        setSelectedImageIndex(selectedImageIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, images.length]);

  return (
    <>
      <div className="mb-3 overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex gap-2" style={{ height: '300px' }}>
          {images.map((img, index) => (
            <div 
              key={img.id} 
              className="relative flex-shrink-0 rounded-md border border-gray-100 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              style={{ width: '300px', height: '300px' }}
              onClick={() => openLightbox(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrls[index]} 
                alt={`Post image ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-60"
            onClick={closeLightbox}
          >
            <X className="w-8 h-8" />
          </button>
          
          {selectedImageIndex > 0 && (
            <button
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-60"
              onClick={prevImage}
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}
          
          {selectedImageIndex < images.length - 1 && (
            <button
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-60"
              onClick={nextImage}
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}

          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={imageUrls[selectedImageIndex]} 
              alt={`Post image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}

export default function PostCard({ post, onUserClick, onEdit, onDelete }: PostCardProps) {
  const [likeState, setLikeState] = useState<{ type: 'like' | 'dislike' | null }>({ type: null });
  const [bookmark, setBookmark] = useState<boolean>(!!post.bookmarked);
  const [showMenu, setShowMenu] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [counts, setCounts] = useState<{ like: number; dislike: number; comment: number }>(() => ({
    like: post.like_count ?? 0,
    dislike: post.dislike_count ?? 0,
    comment: post.comment_count ?? 0,
  }));
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([]);

  // Check if current user is the post owner
  useEffect(() => {
    const checkOwner = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === post.author_id);
    };
    checkOwner();
  }, [post.author_id]);

  // Fetch participants for trip posts
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!post.trip_id) {
        // For regular posts, just show the author
        if (post.author) {
          setParticipants([{
            id: post.author_id,
            name: post.author.name || 'User',
            avatar_url: post.author.avatar_url || undefined
          }]);
        }
        return;
      }

      try {
        // Fetch trip details
        const { data: tripData } = await supabase
          .from('trips')
          .select('owner_id, collaborators')
          .eq('id', post.trip_id)
          .single();

        if (!tripData) {
          // Fallback to just author
          if (post.author) {
            setParticipants([{
              id: post.author_id,
              name: post.author.name || 'User',
              avatar_url: post.author.avatar_url || undefined
            }]);
          }
          return;
        }

        // Get all participant IDs (owner + collaborators)
        const participantIds = [
          tripData.owner_id,
          ...(Array.isArray(tripData.collaborators) ? tripData.collaborators : [])
        ].filter(Boolean);

        // Fetch participant profiles
        if (participantIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', participantIds);

          if (profiles) {
            // Order: owner first, then collaborators
            const ordered = participantIds
              .map(id => profiles.find(p => p.id === id))
              .filter(Boolean)
              .map((p: any) => ({
                id: p.id,
                name: p.name || p.id || 'User',
                avatar_url: (p.avatar_url && typeof p.avatar_url === 'string' && p.avatar_url.trim() !== '') 
                  ? p.avatar_url 
                  : undefined
              }));
            setParticipants(ordered);
          }
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
        // Fallback to just author
        if (post.author) {
          setParticipants([{
            id: post.author_id,
            name: post.author.name || 'User',
            avatar_url: post.author.avatar_url || undefined
          }]);
        }
      }
    };

    fetchParticipants();
  }, [post.trip_id, post.author_id, post.author]);

  // Subscribe to counts updates
  useEffect(() => {
    const channel = supabase
      .channel(`post-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions', filter: `post_id=eq.${post.id}` }, () => {
        refreshCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${post.id}` }, () => {
        refreshCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_bookmarks', filter: `post_id=eq.${post.id}` }, () => {
        // best-effort; we keep local state for the current user
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const refreshCounts = async () => {
    const [{ count: likeCount }, { count: dislikeCount }, { count: commentCount }] = await Promise.all([
      supabase.from('post_reactions').select('*', { count: 'exact', head: true }).eq('post_id', post.id).eq('type', 'like'),
      supabase.from('post_reactions').select('*', { count: 'exact', head: true }).eq('post_id', post.id).eq('type', 'dislike'),
      supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
    ]);
    setCounts({ like: likeCount ?? 0, dislike: dislikeCount ?? 0, comment: commentCount ?? 0 });
  };

  const toggleReaction = async (type: 'like' | 'dislike') => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const userId = userData.user.id;
    if (likeState.type === type) {
      // remove reaction
      setLikeState({ type: null });
      await supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: userId });
    } else {
      setLikeState({ type });
      // upsert
      await supabase.from('post_reactions').upsert({ post_id: post.id, user_id: userId, type });
    }
  };

  const toggleBookmark = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const userId = userData.user.id;
    if (bookmark) {
      setBookmark(false);
      await supabase.from('post_bookmarks').delete().match({ post_id: post.id, user_id: userId });
    } else {
      setBookmark(true);
      await supabase.from('post_bookmarks').upsert({ post_id: post.id, user_id: userId });
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  const submitComment = async () => {
    if (!commentContent.trim()) return;
    setCommentLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from('post_comments').insert({ 
        post_id: post.id, 
        user_id: userData.user.id, 
        content: commentContent.trim() 
      });
      setCommentContent("");
    } finally {
      setCommentLoading(false);
    }
  };

  const getFlagUrl = (code: string) => {
    if (!code) return '';
    return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
  };

  // Find country code from country name if code is missing
  const getCountryCode = (countryName?: string | null, countryCode?: string | null): string | null => {
    if (countryCode) return countryCode;
    if (!countryName) return null;
    
    // Try to find country code from a small lookup list of common countries
    const countryMap: Record<string, string> = {
      'United States': 'US',
      'United Kingdom': 'GB',
      'Japan': 'JP',
      'South Korea': 'KR',
      'China': 'CN',
      'Thailand': 'TH',
      'Singapore': 'SG',
      'Malaysia': 'MY',
      'Indonesia': 'ID',
      'Philippines': 'PH',
      'Vietnam': 'VN',
      'India': 'IN',
      'Australia': 'AU',
      'New Zealand': 'NZ',
      'France': 'FR',
      'Germany': 'DE',
      'Italy': 'IT',
      'Spain': 'ES',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Turkey': 'TR',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      'Egypt': 'EG',
      'South Africa': 'ZA',
      'Brazil': 'BR',
      'Mexico': 'MX',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Canada': 'CA',
    };
    
    return countryMap[countryName] || null;
  };

  const countryPill = useMemo(() => {
    if (!post.country_name && !post.country_code) return null;
    
    const countryCode = getCountryCode(post.country_name, post.country_code);
    const displayCode = countryCode || post.country_code || 'XX';
    
    return (
      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full inline-flex items-center gap-1.5">
        {countryCode && (
          <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-gray-300 shadow-sm">
            <img 
              src={getFlagUrl(countryCode)} 
              alt={post.country_name || displayCode}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <span>{post.country_code || displayCode}</span>
      </span>
    );
  }, [post.country_code, post.country_name]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex items-center gap-3">
          {participants.length > 0 && (
            <AvatarStack
              participants={participants}
              maxVisible={3}
              size="sm"
          />
        )}
          <div>
          <div 
            className="text-sm font-medium cursor-pointer hover:text-[#ff5a58] transition-colors"
            onClick={() => onUserClick?.(post.author_id)}
          >
            {post.author?.name || 'User'}
          </div>
          <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {countryPill}
          {isOwner && (
            <div className="relative">
              <button
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[120px]">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit?.(post);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      onClick={() => {
                        setShowMenu(false);
                        if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                          onDelete?.(post.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="whitespace-pre-wrap text-gray-800 mb-3">{post.content}</div>

      {post.images && post.images.length > 0 && (
        <ImageCarousel images={post.images} />
      )}

      <div className="flex items-center gap-4 text-gray-600">
        <button className={`cursor-pointer inline-flex items-center gap-1 ${likeState.type === 'like' ? 'text-[#ff5a58]' : 'hover:text-gray-800'}`} onClick={() => toggleReaction('like')}>
          <img 
            src={likeState.type === 'like' ? '/assets/bone.svg' : '/assets/bone-plain.svg'} 
            alt="Like" 
            className="w-4 h-4"
            style={likeState.type === 'like' ? {
              filter: 'brightness(0) saturate(100%) invert(54%) sepia(95%) saturate(2060%) hue-rotate(338deg) brightness(101%) contrast(102%)'
            } : {
              filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
            }}
          />
          <span style={{ color: likeState.type === 'like' ? '#ff5a58' : 'inherit' }}>
            {counts.like}
          </span>
        </button>
        <button className={`cursor-pointer inline-flex items-center gap-1 ${likeState.type === 'dislike' ? 'text-[#ff5a58]' : 'hover:text-gray-800'}`} onClick={() => toggleReaction('dislike')}>
          <img 
            src={likeState.type === 'dislike' ? '/assets/bone-crack.svg' : '/assets/bone-broken-plain.svg'} 
            alt="Dislike" 
            className="w-4 h-4"
            style={likeState.type === 'dislike' ? {
              filter: 'brightness(0) saturate(100%) invert(54%) sepia(95%) saturate(2060%) hue-rotate(338deg) brightness(101%) contrast(102%)'
            } : {
              filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
            }}
          />
          <span style={{ color: likeState.type === 'dislike' ? '#ff5a58' : 'inherit' }}>
            {counts.dislike}
          </span>
        </button>
        <button className={`cursor-pointer inline-flex items-center gap-1 hover:text-gray-800 ${showComments ? 'text-[#ff5a58]' : ''}`} onClick={toggleComments}>
          <MessageCircle className={`w-4 h-4 ${showComments ? 'fill-current' : ''}`} /> {counts.comment}
        </button>
        <button className={`cursor-pointer inline-flex items-center gap-1 ml-auto ${bookmark ? 'text-[#ff5a58]' : 'hover:text-gray-800'}`} onClick={toggleBookmark}>
          <Bookmark className={`w-4 h-4 ${bookmark ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-200 data-[state=open]:animate-in">
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">Be the first to comment.</div>
            ) : comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span 
                      className="font-medium cursor-pointer hover:text-[#ff5a58] transition-colors"
                      onClick={() => onUserClick?.(c.user_id)}
                    >
                      {c.author?.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{c.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <textarea 
              className="w-full border border-gray-300 rounded-md p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a58] text-sm" 
              rows={2} 
              placeholder="Write a comment..." 
              value={commentContent} 
              onChange={(e) => setCommentContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
            />
            <div className="flex justify-end">
              <button 
                className="px-4 py-1.5 rounded-md bg-[#ff5a58] text-white text-sm disabled:opacity-60 hover:bg-[#e04a48] transition-colors" 
                onClick={submitComment} 
                disabled={commentLoading || !commentContent.trim()}
              >
                {commentLoading ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



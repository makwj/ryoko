"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface UserProfileDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface UserStats {
  followers: number;
  following: number;
  totalLikes: number;
  tripsCompleted: number;
}

export default function UserProfileDialog({ userId, isOpen, onClose }: UserProfileDialogProps) {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({
    followers: 0,
    following: 0,
    totalLikes: 0,
    tripsCompleted: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        // Check if user is logged in (optional for visitors)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setCurrentUserId(currentUser.id);
        }

        // Load profile (works for visitors too)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!profileData) {
          toast.error('Profile not found');
          return;
        }

        setProfile(profileData);

        // Load stats (works for visitors too)
        const [
          { count: followersCount },
          { count: followingCount },
          { data: postsData },
          { count: tripsCompletedCount }
        ] = await Promise.all([
          // Followers count
          supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId),
          // Following count
          supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId),
          // Posts for calculating total likes
          supabase
            .from('posts')
            .select('id')
            .eq('author_id', userId),
          // Completed trips count
          supabase
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId)
            .eq('completed', true),
        ]);

        // Calculate total likes from user's posts
        let totalLikes = 0;
        if (postsData && postsData.length > 0) {
          const postIds = postsData.map(p => p.id);
          const { count: likesCount } = await supabase
            .from('post_reactions')
            .select('*', { count: 'exact', head: true })
            .in('post_id', postIds)
            .eq('type', 'like');
          totalLikes = likesCount || 0;
        }

        setStats({
          followers: followersCount || 0,
          following: followingCount || 0,
          totalLikes,
          tripsCompleted: tripsCompletedCount || 0,
        });

        // Check if current user is following this user (only if logged in)
        if (currentUser && currentUser.id !== userId) {
          const { data: followData } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId)
            .maybeSingle();
          
          setIsFollowing(!!followData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, userId]);

  const handleFollowToggle = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === userId) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .match({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        toast.success('Unfollowed');
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast.success('Followed');
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      toast.error('Failed to update follow status');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-md shadow-xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse mb-4" />
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            </div>
          ) : (
            <>
              {/* Profile Image */}
              <div className="flex flex-col items-center mb-6">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name || 'User'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-gray-100 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-gray-400">
                      {profile?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>

              {/* Name and Username */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile?.name || 'User'}
                </h2>
                {profile?.email && (
                  <p className="text-sm text-gray-500">
                    {profile.email}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.followers}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.following}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.totalLikes}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.tripsCompleted}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Trips Completed</div>
                </div>
              </div>

              {/* Follow/Unfollow Button - only show if not viewing own profile */}
              {currentUserId !== userId && (
                <button
                  onClick={handleFollowToggle}
                  disabled={actionLoading || !currentUserId}
                  className={`w-full py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-[#ff5a58] text-white hover:bg-[#ff4a47]'
                  } disabled:opacity-60`}
                >
                  {actionLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


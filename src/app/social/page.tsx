"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User } from "@supabase/supabase-js";
import { Users, Search, PlusCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import PostCard, { PostRecord } from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import UserSearch from "@/components/UserSearch";
import SharedTripCard from "@/components/SharedTripCard";
import UserProfileDialog from "@/components/UserProfileDialog";
import EditPostModal from "@/components/EditPostModal";

function SocialPageInner() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [attachTripId, setAttachTripId] = useState<string | null>(null);
  const [featured, setFeatured] = useState<PostRecord[]>([]);
  const [featuredGuides, setFeaturedGuides] = useState<Array<{ type: 'trip'; data: any }>>([]);
  const [feed, setFeed] = useState<Array<PostRecord | { type: 'trip'; data: any }>>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef<{ from?: string; size: number }>({ size: 10 });
  const searchParams = useSearchParams();
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'following' | 'your-posts'>('following');
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  // Open composer if attachTripId is passed in URL
  useEffect(() => {
    const tid = searchParams?.get('attachTripId');
    if (tid) {
      setAttachTripId(tid);
      setShowComposer(true);
    }
  }, [searchParams]);

  const loadFeatured = useCallback(async () => {
    const postsPromise = supabase
      .from('posts')
      .select('*, author:profiles(name, avatar_url), images:post_images(*), post_reactions(count), post_comments(count)')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(10);

    const guidesPromise = supabase
      .from('trips')
      .select('*')
      .eq('shared_to_social', true)
      .eq('archived', false)
      .eq('is_featured_social', true)
      .order('updated_at', { ascending: false })
      .limit(10);

    try {
      const [{ data: postsData }, { data: guidesData }] = await Promise.all([postsPromise, guidesPromise]);
      const postItems = postsData ? normalizePosts(postsData) : [];
      let guideItems: Array<{ type: 'trip'; data: any }> = [];
      if (guidesData && guidesData.length > 0) {
        try {
          const enriched = await Promise.all(guidesData.map(trip => enrichTrip(trip)));
          guideItems = enriched.filter(t => t).map(t => ({ type: 'trip', data: t }));
        } catch (error) {
          console.error('Error enriching featured guides:', error);
        }
      }
      // Store featured posts and guides separately
      setFeatured(postItems);
      setFeaturedGuides(guideItems);
    } catch (error) {
      console.error('Error loading featured content:', error);
    }
  }, []);

  // Helper to enrich trip with author and activity count
  const enrichTrip = async (trip: any) => {
    try {
      const [{ count }, { data: authorData }] = await Promise.all([
        supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('trip_id', trip.id),
        supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', trip.owner_id)
          .single(),
      ]);
    
    // Extract country from destination if not stored
    const extractCountryFromDestination = (destination: string): string => {
      if (!destination) return "";
      const parts = destination.split(',').map(part => part.trim());
      return parts[parts.length - 1] || "";
    };

    const getCountryCodeFromName = (name: string): string | null => {
      if (!name) return null;
      const countryMap: Record<string, string> = {
        'United States': 'US', 'United Kingdom': 'GB', 'Japan': 'JP', 'South Korea': 'KR', 'China': 'CN',
        'Thailand': 'TH', 'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID', 'Philippines': 'PH',
        'Vietnam': 'VN', 'India': 'IN', 'Australia': 'AU', 'New Zealand': 'NZ', 'France': 'FR',
        'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Portugal': 'PT', 'Greece': 'GR', 'Turkey': 'TR',
        'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', 'Egypt': 'EG', 'South Africa': 'ZA',
        'Brazil': 'BR', 'Mexico': 'MX', 'Argentina': 'AR', 'Chile': 'CL', 'Canada': 'CA',
        'UAE': 'AE', 'UK': 'GB', 'USA': 'US', 'Dubai': 'AE', 'U.A.E': 'AE',
      };
      return countryMap[name] || null;
    };

      const extractedCountry = trip.destination ? extractCountryFromDestination(trip.destination) : null;
      const derivedCountryCode = extractedCountry ? getCountryCodeFromName(extractedCountry) : null;

      return {
        ...trip, // This should include trip_image_url from the original query
        activity_count: count || 0,
        author: authorData || null,
        share_caption: trip.share_caption || null,
        trip_image_url: trip.trip_image_url || null, // Explicitly preserve
        country_name: trip.country_name || extractedCountry || null,
        country_code: trip.country_code || derivedCountryCode || null,
      };
    } catch (error) {
      console.error('Error enriching trip:', error);
      // Return trip with minimal enrichment on error
      return {
        ...trip,
        activity_count: 0,
        author: null,
      };
    }
  };

  const normalizePosts = (rows: any[]): PostRecord[] => {
    return rows.map((row: any) => ({
      id: row.id,
      author_id: row.author_id,
      content: row.content,
      country_code: row.country_code,
      country_name: row.country_name,
      is_featured: row.is_featured,
      trip_id: row.trip_id,
      created_at: row.created_at,
      author: row.author,
      images: (row.images || []).sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      like_count: (row.post_reactions as any)?.count ?? 0,
      dislike_count: 0, // refined counts fetched in PostCard
      comment_count: (row.post_comments as any)?.count ?? 0,
      bookmarked: false,
    }));
  };

  // Load Explore feed (latest posts and trips, sorted by creation date)
  const loadExploreFeed = useCallback(async (reset = false) => {
    setLoading((prevLoading) => {
      if (prevLoading) return prevLoading;
      return true;
    });

    if (reset) {
      pageRef.current.from = undefined;
    }

    // Get all posts (latest first), excluding featured posts
    const postsBase = supabase
      .from('posts')
      .select('*, author:profiles(name, avatar_url), images:post_images(*)')
      .neq('is_featured', true)
      .order('created_at', { ascending: false });

    if (!reset && pageRef.current.from) {
      postsBase.lt('created_at', pageRef.current.from);
    }

    // Get all shared trips (latest shared first, use updated_at), excluding featured guides
    const tripsBase = supabase
      .from('trips')
      .select('*')
      .eq('shared_to_social', true)
      .eq('archived', false)
      .neq('is_featured_social', true)
      .order('updated_at', { ascending: false });

    if (!reset && pageRef.current.from) {
      tripsBase.lt('updated_at', pageRef.current.from);
    }

    // Fetch both in parallel
    const [postsResult, tripsResult] = await Promise.all([
      postsBase.limit(pageRef.current.size),
      tripsBase.limit(pageRef.current.size),
    ]);

    // Combine and sort by created_at/updated_at descending
    const allItems: Array<{ type: 'post' | 'trip'; created_at: string; data: any }> = [];

    if (postsResult.data) {
      const normalizedPosts = normalizePosts(postsResult.data);
      normalizedPosts.forEach(post => {
        allItems.push({ type: 'post', created_at: post.created_at, data: post });
      });
    }

    if (tripsResult.data && tripsResult.data.length > 0) {
      const enrichedTrips = await Promise.all(
        tripsResult.data.map(trip => enrichTrip(trip))
      );
      enrichedTrips.forEach(trip => {
        allItems.push({
          type: 'trip',
          created_at: trip.updated_at || trip.created_at || new Date().toISOString(),
          data: trip
        });
      });
    }

    // Sort by created_at/updated_at descending (latest first)
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Take only the requested size
    const itemsToAdd = allItems.slice(0, pageRef.current.size);

    // Format for feed
    const feedItems = itemsToAdd.map(item => {
      if (item.type === 'post') {
        return item.data;
      } else {
        return { type: 'trip', data: item.data };
      }
    });

    setFeed((prev) => {
      return reset ? feedItems : [...prev, ...feedItems];
    });

    if (itemsToAdd.length > 0) {
      pageRef.current.from = itemsToAdd[itemsToAdd.length - 1].created_at;
    }

    // If we got fewer results than requested, we've reached the end
    if (itemsToAdd.length < pageRef.current.size) {
      pageRef.current.from = undefined; // Mark as complete
    }

    setLoading(false);
  }, []);

  // Load Following feed (posts from users you follow)
  const loadFollowingFeed = useCallback(async (reset = false) => {
    setLoading((prevLoading) => {
      if (prevLoading) return prevLoading;
      return true;
    });

    if (reset) {
      pageRef.current.from = undefined;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get users you follow
    const { data: followingData } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (!followingData || followingData.length === 0) {
      setFeed([]);
      setLoading(false);
      return;
    }

    const followingIds = followingData.map(f => f.following_id);

    // Fetch posts from followed users
    const postsBase = supabase
      .from('posts')
      .select('*, author:profiles(name, avatar_url), images:post_images(*)')
      .in('author_id', followingIds)
      .order('created_at', { ascending: false });

    if (!reset && pageRef.current.from) {
      postsBase.lt('created_at', pageRef.current.from);
    }

    // Fetch shared trips from followed users
    const tripsBase = supabase
      .from('trips')
      .select('*')
      .eq('shared_to_social', true)
      .eq('archived', false)
      .in('owner_id', followingIds)
      .order('created_at', { ascending: false });

    if (!reset && pageRef.current.from) {
      tripsBase.lt('created_at', pageRef.current.from);
    }

    // Fetch both in parallel
    const [postsResult, tripsResult] = await Promise.all([
      postsBase.limit(pageRef.current.size),
      tripsBase.limit(pageRef.current.size),
    ]);

    // Combine and sort by created_at
    const allItems: Array<{ type: 'post' | 'trip'; created_at: string; data: any }> = [];

    if (postsResult.data) {
      const normalizedPosts = normalizePosts(postsResult.data);
      normalizedPosts.forEach(post => {
        allItems.push({ type: 'post', created_at: post.created_at, data: post });
      });
    }

    if (tripsResult.data && tripsResult.data.length > 0) {
      const enrichedTrips = await Promise.all(
        tripsResult.data.map(trip => enrichTrip(trip))
      );
      enrichedTrips.forEach(trip => {
        allItems.push({
          type: 'trip',
          created_at: trip.created_at || trip.updated_at || new Date().toISOString(),
          data: trip
        });
      });
    }

    // Sort by created_at descending
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Take only the requested size
    const itemsToAdd = allItems.slice(0, pageRef.current.size);

    const feedItems = itemsToAdd.map(item =>
      item.type === 'post'
        ? item.data
        : { type: 'trip', data: item.data }
    );

    setFeed((prev) => {
      return reset ? feedItems : [...prev, ...feedItems];
    });

    if (itemsToAdd.length > 0) {
      pageRef.current.from = itemsToAdd[itemsToAdd.length - 1].created_at;
    }

    // If we got fewer results than requested, we've reached the end
    if (itemsToAdd.length < pageRef.current.size) {
      pageRef.current.from = undefined; // Mark as complete
    }

    setLoading(false);
  }, []);

  // Load Your Posts feed
  const loadYourPostsFeed = useCallback(async (reset = false) => {
    setLoading((prevLoading) => {
      if (prevLoading) return prevLoading;
      return true;
    });

    if (reset) {
      pageRef.current.from = undefined;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const postsBase = supabase
      .from('posts')
      .select('*, author:profiles(name, avatar_url), images:post_images(*)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (!reset && pageRef.current.from) {
      postsBase.lt('created_at', pageRef.current.from);
    }

    // Fetch shared trips from current user
    const tripsBase = supabase
      .from('trips')
      .select('*')
      .eq('shared_to_social', true)
      .eq('archived', false)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (!reset && pageRef.current.from) {
      tripsBase.lt('created_at', pageRef.current.from);
    }

    // Fetch both in parallel
    const [postsResult, tripsResult] = await Promise.all([
      postsBase.limit(pageRef.current.size),
      tripsBase.limit(pageRef.current.size),
    ]);

    // Combine and sort by created_at
    const allItems: Array<{ type: 'post' | 'trip'; created_at: string; data: any }> = [];

    if (postsResult.data) {
      const normalizedPosts = normalizePosts(postsResult.data);
      normalizedPosts.forEach(post => {
        allItems.push({ type: 'post', created_at: post.created_at, data: post });
      });
    }

    if (tripsResult.data && tripsResult.data.length > 0) {
      const enrichedTrips = await Promise.all(
        tripsResult.data.map(trip => enrichTrip(trip))
      );
      enrichedTrips.forEach(trip => {
        allItems.push({
          type: 'trip',
          created_at: trip.created_at || trip.updated_at || new Date().toISOString(),
          data: trip
        });
      });
    }

    // Sort by created_at descending
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Take only the requested size
    const itemsToAdd = allItems.slice(0, pageRef.current.size);

    const feedItems = itemsToAdd.map(item =>
      item.type === 'post'
        ? item.data
        : { type: 'trip', data: item.data }
    );

    setFeed((prev) => {
      return reset ? feedItems : [...prev, ...feedItems];
    });

    if (itemsToAdd.length > 0) {
      pageRef.current.from = itemsToAdd[itemsToAdd.length - 1].created_at;
    }

    // If we got fewer results than requested, we've reached the end
    if (itemsToAdd.length < pageRef.current.size) {
      pageRef.current.from = undefined; // Mark as complete
    }

    setLoading(false);
  }, []);

  const loadFeed = useCallback(async (reset = false) => {
    setLoading((prevLoading) => {
      if (prevLoading) return prevLoading;
      return true;
    });
    
    if (reset) {
      pageRef.current.from = undefined;
    }
    
    // Fetch posts
    const postsBase = supabase
      .from('posts')
      .select('*, author:profiles(name, avatar_url), images:post_images(*)')
      .order('created_at', { ascending: false });
    
    if (!reset && pageRef.current.from) {
      postsBase.lt('created_at', pageRef.current.from);
    }
    
    // Fetch shared trips
    const tripsBase = supabase
      .from('trips')
      .select('*')
      .eq('shared_to_social', true)
      .eq('archived', false)
      .order('created_at', { ascending: false });
    
    if (!reset && pageRef.current.from) {
      tripsBase.lt('created_at', pageRef.current.from);
    }
    
    // Fetch both in parallel
    const [postsResult, tripsResult] = await Promise.all([
      postsBase.limit(pageRef.current.size),
      tripsBase.limit(pageRef.current.size),
    ]);
    
    // Combine and sort by created_at
    const allItems: Array<{ type: 'post' | 'trip'; created_at: string; data: any }> = [];
    
    if (!postsResult.error && postsResult.data) {
      const normalizedPosts = normalizePosts(postsResult.data);
      normalizedPosts.forEach(post => {
        allItems.push({ type: 'post', created_at: post.created_at, data: post });
      });
    }
    
    if (!tripsResult.error && tripsResult.data) {
      // Enrich trips with author and activity count
      const enrichedTrips = await Promise.all(
        tripsResult.data.map(trip => enrichTrip(trip))
      );
      enrichedTrips.forEach(trip => {
        // Ensure created_at is preserved
        allItems.push({ 
          type: 'trip', 
          created_at: trip.created_at || trip.updated_at || new Date().toISOString(), 
          data: trip 
        });
      });
    }
    
    // Sort by created_at descending
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Take only the requested size
    const itemsToAdd = allItems.slice(0, pageRef.current.size);
    
    setFeed((prev) => {
      const newItems = itemsToAdd.map(item => 
        item.type === 'post' 
          ? item.data 
          : { type: 'trip', data: item.data }
      );
      return reset ? newItems : [...prev, ...newItems];
    });
    
    if (itemsToAdd.length > 0) {
      pageRef.current.from = itemsToAdd[itemsToAdd.length - 1].created_at;
    }
    
    // If we got fewer results than requested, we've reached the end
    if (itemsToAdd.length < pageRef.current.size) {
      pageRef.current.from = undefined; // Mark as complete
    }
    
    setLoading(false);
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'explore') {
      loadExploreFeed(true);
      loadFeatured();
    } else if (activeTab === 'following') {
      loadFollowingFeed(true);
    } else if (activeTab === 'your-posts') {
      loadYourPostsFeed(true);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps


  // realtime subscriptions for posts and trips
  useEffect(() => {
    const channel = supabase
      .channel('social-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        // Fetch the full post with author and images to ensure we have all data
        const { data: fullPost } = await supabase
          .from('posts')
          .select('*, author:profiles(name, avatar_url), images:post_images(*)')
          .eq('id', (payload.new as any).id)
          .single();
        
        if (fullPost) {
          const normalizedPost = normalizePosts([fullPost])[0];
          setFeed((prev) => [normalizedPost, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, async (payload) => {
        // Fetch the full post with author and images
        const { data: fullPost } = await supabase
          .from('posts')
          .select('*, author:profiles(name, avatar_url), images:post_images(*)')
          .eq('id', (payload.new as any).id)
          .single();
        
        if (fullPost) {
          const updatedPost = normalizePosts([fullPost])[0];
          setFeed((prev) => prev.map(item => {
            if (typeof item === 'object' && 'id' in item && item.id === updatedPost.id && !('type' in item)) {
              return updatedPost;
            }
            return item;
          }));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setFeed((prev) => prev.filter(item => {
          if (typeof item === 'object' && 'id' in item) {
            return item.id !== (payload.old as any).id;
          }
          return true;
        }));
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'trips',
        filter: 'shared_to_social=eq.true'
      }, async (payload) => {
        const updatedTrip = await enrichTrip(payload.new as any);
        setFeed((prev) => prev.map(item => {
          if (typeof item === 'object' && 'type' in item && item.type === 'trip' && item.data.id === updatedTrip.id) {
            return { type: 'trip', data: updatedTrip };
          }
          return item;
        }));
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'trips',
        filter: 'shared_to_social=eq.true'
      }, async (payload) => {
        const newTrip = await enrichTrip(payload.new as any);
        setFeed((prev) => [{ type: 'trip', data: newTrip }, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'trips',
        filter: 'shared_to_social=eq.false'
      }, (payload) => {
        // Remove trip from feed if unshared
        setFeed((prev) => prev.filter(item => {
          if (typeof item === 'object' && 'type' in item && item.type === 'trip') {
            return item.data.id !== (payload.new as any).id;
          }
          return true;
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPosted = () => {
    // Reload based on active tab
    if (activeTab === 'explore') {
      loadExploreFeed(true);
      loadFeatured();
    } else if (activeTab === 'following') {
      loadFollowingFeed(true);
    } else if (activeTab === 'your-posts') {
      loadYourPostsFeed(true);
    }
  };

  const handlePostEdit = (post: PostRecord) => {
    setEditingPost(post);
  };

  const handlePostDelete = async (postId: string) => {
    try {
      // Get post images first
      const { data: imagesData } = await supabase
        .from('post_images')
        .select('image_path')
        .eq('post_id', postId);

      // Delete images from storage
      if (imagesData && imagesData.length > 0) {
        for (const img of imagesData) {
          await supabase.storage.from('post-images').remove([img.image_path]);
        }
      }

      // Delete post (cascade will handle images, reactions, comments, bookmarks)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Refresh feed
      if (activeTab === 'explore') {
        loadExploreFeed(true);
      } else if (activeTab === 'following') {
        loadFollowingFeed(true);
      } else if (activeTab === 'your-posts') {
        loadYourPostsFeed(true);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handlePostUpdated = () => {
    setEditingPost(null);
    // Reload based on active tab
    if (activeTab === 'explore') {
      loadExploreFeed(true);
    } else if (activeTab === 'following') {
      loadFollowingFeed(true);
    } else if (activeTab === 'your-posts') {
      loadYourPostsFeed(true);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('following')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'following'
                    ? 'border-[#ff5a58] text-[#ff5a58]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Following
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'explore'
                    ? 'border-[#ff5a58] text-[#ff5a58]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setActiveTab('your-posts')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'your-posts'
                    ? 'border-[#ff5a58] text-[#ff5a58]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Your Posts
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
            <div className="flex gap-2">
              <div className="relative">
                <input
                  className="border border-gray-300 rounded-md px-3 py-2 w-64"
                  placeholder="Search users..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowUserSearch(true);
                  }}
                  onFocus={() => setShowUserSearch(true)}
                  onBlur={() => setTimeout(() => setShowUserSearch(false), 200)}
                />
                {showUserSearch && <UserSearch query={query} onClose={() => setShowUserSearch(false)} />}
              </div>
              <button className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-md" onClick={() => setShowComposer(true)}>
                <PlusCircle className="w-4 h-4 inline mr-1" /> New Post
            </button>
            </div>
          </div>

          {/* Featured Posts & Guides - only show on Explore tab */}
          {activeTab === 'explore' && (featured.length > 0 || featuredGuides.length > 0) && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4 text-[#ff5a58] font-semibold">
                <Sparkles className="w-5 h-5" /> Featured
              </div>
              <div className="space-y-4">
                {featured.map((p) => (
                  <PostCard 
                    key={p.id} 
                    post={p} 
                    onUserClick={setSelectedUserId}
                    onEdit={handlePostEdit}
                    onDelete={handlePostDelete}
                  />
                ))}
                {featuredGuides.map((guide) => (
                  <SharedTripCard 
                    key={guide.data.id} 
                    trip={guide.data} 
                    onUserClick={setSelectedUserId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Feed */}
          <section className="space-y-4">
            {feed.map((item) => {
              if (typeof item === 'object' && 'type' in item && item.type === 'trip') {
                return (
                  <SharedTripCard 
                    key={item.data.id} 
                    trip={item.data} 
                    onUserClick={setSelectedUserId}
                  />
                );
              } else {
                // It's a post
                return (
                  <PostCard 
                    key={item.id} 
                    post={item as PostRecord} 
                    onUserClick={setSelectedUserId}
                    onEdit={handlePostEdit}
                    onDelete={handlePostDelete}
                  />
                );
              }
            })}
            {feed.length > 0 && activeTab !== 'explore' && pageRef.current.from !== undefined && (
              <div className="text-center">
                <button
                  className="px-4 py-2 rounded-md border hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (activeTab === 'explore') {
                        loadExploreFeed();
                      } else if (activeTab === 'following') {
                        loadFollowingFeed();
                      } else if (activeTab === 'your-posts') {
                        loadYourPostsFeed();
                      }
                    }}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
            {feed.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No posts found. Be the first to share!
              </div>
            )}
          </section>
        </main>

        <PostComposer isOpen={showComposer} onClose={() => setShowComposer(false)} onPosted={onPosted} attachTripId={attachTripId} />
        
        {editingPost && (
          <EditPostModal
            isOpen={!!editingPost}
            onClose={() => setEditingPost(null)}
            post={editingPost}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDelete}
          />
        )}

        {selectedUserId && (
          <UserProfileDialog 
            userId={selectedUserId} 
            isOpen={!!selectedUserId} 
            onClose={() => setSelectedUserId(null)} 
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function SocialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"><Navbar /><main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20"><div className="text-center text-gray-500">Loading...</div></main></div>}>
      <SocialPageInner />
    </Suspense>
  );
}

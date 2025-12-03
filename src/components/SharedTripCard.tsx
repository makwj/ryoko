"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, MapPin, Users, Eye, Bookmark, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import TripComments from "./TripComments";
import AvatarStack from "@/components/ui/avatar-stack";

interface SharedTrip {
  id: string;
  title: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  interests?: string[] | null;
  trip_image_url?: string | null;
  owner_id: string;
  share_caption?: string | null;
  created_at?: string;
  updated_at?: string;
  country_name?: string | null;
  country_code?: string | null;
  author?: {
    name?: string | null;
    avatar_url?: string | null;
  };
  activity_count?: number;
  collaborators?: string[] | null;
}

interface SharedTripCardProps {
  trip: SharedTrip;
  onOpenComments?: (tripId: string) => void;
  onUserClick?: (userId: string) => void;
}

export default function SharedTripCard({ trip, onOpenComments, onUserClick }: SharedTripCardProps) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dynamicImageUrl, setDynamicImageUrl] = useState<string | null>(null);
  const [likeState, setLikeState] = useState<{ type: 'like' | 'dislike' | null }>({ type: null });
  const [counts, setCounts] = useState<{ like: number; dislike: number; comment: number }>({
    like: 0,
    dislike: 0,
    comment: 0,
  });
  const [showComments, setShowComments] = useState(false);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([]);

  // Fetch destination image from Unsplash/Pixabay if no trip_image_url
  useEffect(() => {
    const fetchDestinationImage = async () => {
      if (trip.trip_image_url || !trip.destination) {
        setDynamicImageUrl(null);
        return;
      }

      try {
        const locationParts = trip.destination.split(',').map(part => part.trim());
        const city = locationParts[0];
        const country = locationParts[locationParts.length - 1];

        // Try Unsplash API first
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)} ${encodeURIComponent(country)}&per_page=1&orientation=landscape&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
        );

        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json();
          if (unsplashData.results && unsplashData.results.length > 0) {
            setDynamicImageUrl(unsplashData.results[0].urls.regular);
            return;
          }
        }

        // Fallback to Pixabay API
        const pixabayResponse = await fetch(
          `https://pixabay.com/api/?key=${process.env.NEXT_PUBLIC_PIXABAY_API_KEY}&q=${encodeURIComponent(city)} ${encodeURIComponent(country)}&image_type=photo&orientation=horizontal&category=places&per_page=3&safesearch=true`
        );

        if (pixabayResponse.ok) {
          const pixabayData = await pixabayResponse.json();
          if (pixabayData.hits && pixabayData.hits.length > 0) {
            setDynamicImageUrl(pixabayData.hits[0].webformatURL);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch destination image:', err);
      }
    };

    fetchDestinationImage();
  }, [trip.id, trip.trip_image_url, trip.destination]);

  // Reset image error when trip changes
  useEffect(() => {
    setImageError(false);
  }, [trip.id, trip.trip_image_url]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`trip-${trip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_reactions', filter: `trip_id=eq.${trip.id}` }, async () => {
        await refreshCounts();
        await loadReactions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_comments', filter: `trip_id=eq.${trip.id}` }, () => {
        refreshCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.id]);

  const refreshCounts = async () => {
    const [{ count: likeCount }, { count: dislikeCount }, { count: commentCount }] = await Promise.all([
      supabase.from('trip_reactions').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id).eq('type', 'like'),
      supabase.from('trip_reactions').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id).eq('type', 'dislike'),
      supabase.from('trip_comments').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id),
    ]);
    setCounts({ like: likeCount ?? 0, dislike: dislikeCount ?? 0, comment: commentCount ?? 0 });
  };

  // Initial load of reactions and counts
  useEffect(() => {
    const initializeReactions = async () => {
      await refreshCounts();
      await loadReactions();
    };
    initializeReactions();
  }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleReaction = async (type: 'like' | 'dislike') => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const userId = userData.user.id;
    
    // Optimistic update for better responsiveness
    const previousType = likeState.type;
    const previousCounts = { ...counts };
    
    if (previousType === type) {
      // Remove reaction
      setLikeState({ type: null });
      setCounts(prev => ({
        ...prev,
        [type]: Math.max(0, prev[type] - 1)
      }));
      try {
        await supabase.from('trip_reactions').delete().match({ trip_id: trip.id, user_id: userId });
      } catch (error) {
        // Revert on error
        setLikeState({ type: previousType });
        setCounts(previousCounts);
      }
    } else {
      // Change or add reaction
      setLikeState({ type });
      const newCounts = { ...previousCounts };
      if (previousType) {
        newCounts[previousType] = Math.max(0, newCounts[previousType] - 1);
      }
      newCounts[type] = newCounts[type] + 1;
      setCounts(newCounts);
      try {
        await supabase.from('trip_reactions').upsert({ trip_id: trip.id, user_id: userId, type });
      } catch (error) {
        // Revert on error
        setLikeState({ type: previousType });
        setCounts(previousCounts);
      }
    }
    
    // Refresh to ensure consistency after a delay
    setTimeout(() => {
      refreshCounts();
      loadReactions();
    }, 300);
  };

  const loadReactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's reaction
    const { data: userReaction } = await supabase
      .from('trip_reactions')
      .select('type')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (userReaction) {
      setLikeState({ type: userReaction.type as 'like' | 'dislike' });
    } else {
      setLikeState({ type: null });
    }
  };

  // Check if trip is bookmarked
  useEffect(() => {
    const checkBookmark = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('trip_bookmarks')
        .select('id')
        .eq('trip_id', trip.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setBookmarked(!!data);
    };
    
    checkBookmark();
  }, [trip.id]);

  // Set participants to only show the author (who shared the trip guide)
  useEffect(() => {
    if (trip.author) {
      setParticipants([{
        id: trip.owner_id,
        name: trip.author.name || 'User',
        avatar_url: (trip.author.avatar_url && typeof trip.author.avatar_url === 'string' && trip.author.avatar_url.trim() !== '') 
          ? trip.author.avatar_url 
          : undefined
      }]);
    }
  }, [trip.owner_id, trip.author]);

  const handleCopyTrip = async () => {
    setCopying(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please login to copy trips");
        return;
      }

      // Fetch original trip details
      const { data: originalTrip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', trip.id)
        .single();

      if (tripError || !originalTrip) throw tripError;

      // Fetch all activities
      const { data: originalActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('trip_id', trip.id)
        .order('day_number', { ascending: true })
        .order('time_period', { ascending: true })
        .order('order_index', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Create new trip
      const { data: newTrip, error: createError } = await supabase
        .from('trips')
        .insert({
          owner_id: userData.user.id,
          title: `${originalTrip.title} (Copy)`,
          description: originalTrip.description,
          destination: originalTrip.destination,
          start_date: originalTrip.start_date,
          end_date: originalTrip.end_date,
          interests: originalTrip.interests,
          trip_image_url: originalTrip.trip_image_url,
          shared_to_social: false, // Copied trips are not shared by default
          archived: false,
          completed: false,
        })
        .select()
        .single();

      if (createError || !newTrip) throw createError;

      // Copy all activities
      if (originalActivities && originalActivities.length > 0) {
        const activitiesToInsert = originalActivities.map(activity => ({
          trip_id: newTrip.id,
          day_number: activity.day_number,
          title: activity.title,
          description: activity.description,
          time_period: activity.time_period,
          location: activity.location,
          activity_type: activity.activity_type,
          note: activity.note,
          link_url: activity.link_url,
          attachments: activity.attachments,
          order_index: activity.order_index,
        }));

        const { error: activitiesInsertError } = await supabase
          .from('activities')
          .insert(activitiesToInsert);

        if (activitiesInsertError) throw activitiesInsertError;
      }

      toast.success("Trip copied successfully!");
      router.push(`/trip/${newTrip.id}`);
    } catch (error) {
      console.error('Copy trip error:', error);
      toast.error("Failed to copy trip");
    } finally {
      setCopying(false);
    }
  };

  const toggleBookmark = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Please login to bookmark trips");
      return;
    }
    
    try {
      if (bookmarked) {
        setBookmarked(false);
        await supabase
          .from('trip_bookmarks')
          .delete()
          .match({ trip_id: trip.id, user_id: userData.user.id });
        toast.success("Bookmark removed");
      } else {
        setBookmarked(true);
        await supabase
          .from('trip_bookmarks')
          .upsert({ trip_id: trip.id, user_id: userData.user.id });
        toast.success("Trip guide bookmarked");
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error("Failed to update bookmark");
      setBookmarked(!bookmarked); // Revert on error
    }
  };

  const calculateDays = () => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const tripCreatedAt = trip.created_at || trip.updated_at || new Date().toISOString();

  // Extract country from destination or use stored country
  const extractCountryFromDestination = (destination: string): string => {
    if (!destination) return "";
    const parts = destination.split(',').map(part => part.trim());
    return parts[parts.length - 1] || "";
  };

  // Get country code from country name (basic lookup for common countries)
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

  const getFlagUrl = (code: string) => {
    if (!code) return '';
    return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
  };

  // Get country info for the pill
  const countryName = trip.country_name || (trip.destination ? extractCountryFromDestination(trip.destination) : null);
  const countryCode = trip.country_code || (countryName ? getCountryCodeFromName(countryName) : null);
  const displayCode = countryCode || 'XX';

  const countryPill = countryName || countryCode ? (
    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full inline-flex items-center gap-1.5">
      {countryCode && (
        <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-gray-300 shadow-sm">
          <img 
            src={getFlagUrl(countryCode)} 
            alt={countryName || displayCode}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <span>{countryCode || displayCode}</span>
    </span>
  ) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-full">
      {/* Author header - like PostCard */}
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
              onClick={() => onUserClick?.(trip.owner_id)}
            >
              {trip.author?.name || 'User'}
            </div>
            <div className="text-xs text-gray-500">{new Date(tripCreatedAt).toLocaleString()}</div>
          </div>
        </div>
        {countryPill && <div className="ml-auto">{countryPill}</div>}
      </div>

      {/* Caption text - like post content */}
      {trip.share_caption && (
        <div className="whitespace-pre-wrap text-gray-800 mb-3">
          {trip.share_caption}
        </div>
      )}

      {/* Trip guide card - image with details */}
      <div 
        className="relative w-full rounded-lg overflow-hidden mb-3 border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push(`/trip/view/${trip.id}`)}
      >
        <div className="flex items-stretch max-h-[250px]">
          {/* Trip Image */}
          <div className="relative w-2/5 flex-shrink-0 h-full">
            {(trip.trip_image_url || dynamicImageUrl) && !imageError ? (
              <img 
                src={trip.trip_image_url || dynamicImageUrl || ''} 
                alt={trip.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load trip image:', trip.trip_image_url || dynamicImageUrl);
                  setImageError(true);
                }}
                onLoad={() => {
                  setImageError(false);
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#ff5a58] to-[#ff4a47] flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <span className="text-sm font-medium">{trip.title}</span>
                </div>
              </div>
            )}
          </div>

          {/* Trip Details Section */}
          <div className="flex-1 bg-white p-4 flex flex-col justify-between overflow-hidden">
            <div className="overflow-y-auto flex-1 min-h-0">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{trip.title}</h3>
              
              <div className="space-y-1.5 text-sm text-gray-700">
                {trip.destination && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{trip.destination}</span>
                  </div>
                )}
                {(trip.start_date || trip.end_date) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">
                      {trip.start_date && new Date(trip.start_date).toLocaleDateString()}
                      {trip.start_date && trip.end_date && ' - '}
                      {trip.end_date && new Date(trip.end_date).toLocaleDateString()}
                      {calculateDays() && ` (${calculateDays()} days)`}
                    </span>
                  </div>
                )}
                {trip.activity_count !== undefined && trip.activity_count > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>{trip.activity_count} activities</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interests at bottom */}
            {trip.interests && trip.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100 flex-shrink-0">
                {trip.interests.slice(0, 3).map((interest, idx) => (
                  <span 
                    key={idx} 
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
                {trip.interests.length > 3 && (
                  <span className="text-xs text-gray-500 px-2.5 py-1">
                    +{trip.interests.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - consistent with PostCard */}
      <div className="flex items-center gap-4 text-gray-600 pt-3 border-t border-gray-100">
        <button 
          className={`cursor-pointer inline-flex items-center gap-1 ${likeState.type === 'like' ? 'text-[#ff5a58]' : 'hover:text-gray-800'}`} 
          onClick={(e) => {
            e.stopPropagation();
            toggleReaction('like');
          }}
        >
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
        <button 
          className={`cursor-pointer inline-flex items-center gap-1 ${likeState.type === 'dislike' ? 'text-[#ff5a58]' : 'hover:text-gray-800'}`} 
          onClick={(e) => {
            e.stopPropagation();
            toggleReaction('dislike');
          }}
        >
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
        <button 
          className="cursor-pointer inline-flex items-center gap-1 hover:text-gray-800" 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenComments) {
              onOpenComments(trip.id);
            } else {
              setShowComments(true);
            }
          }}
        >
          <MessageCircle className="w-4 h-4" /> {counts.comment}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyTrip();
          }}
          disabled={copying}
          className="inline-flex items-center gap-1.5 bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-60 ml-auto"
        >
          <img 
            src="/assets/paw.svg" 
            alt="Copy" 
            className="w-3.5 h-3.5"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          {copying ? 'Copying...' : 'Copy'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark();
          }}
          className={`cursor-pointer inline-flex items-center gap-1 ${bookmarked ? 'text-[#ff5a58]' : 'hover:text-gray-800'}`}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments - inline below card */}
      {showComments && (
        <TripComments tripId={trip.id} isOpen={showComments} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}


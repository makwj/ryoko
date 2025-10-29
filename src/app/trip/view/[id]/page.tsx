"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Calendar, MapPin, Users, Bookmark } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import LinkPreview from "@/components/LinkPreview";
import UserProfileDialog from "@/components/UserProfileDialog";

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
  author?: {
    name?: string | null;
    avatar_url?: string | null;
  };
}

interface Activity {
  id: string;
  day_number: number;
  title: string;
  description?: string | null;
  time_period: 'morning' | 'afternoon' | 'evening';
  location?: string | null;
  activity_type: string;
  link_url?: string | null;
}

export default function ViewSharedTripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dynamicImageUrl, setDynamicImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadTrip = async () => {
      if (!params.id) return;

      // Load trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', params.id)
        .eq('shared_to_social', true)
        .single();
      
      if (tripError || !tripData) {
        toast.error("Trip not found or not shared");
        router.push('/social');
        setLoading(false);
        return;
      }

      // Fetch author separately
      const { data: authorData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', tripData.owner_id)
        .single();

      setTrip({
        ...tripData,
        author: authorData || null,
      } as any);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('trip_id', params.id)
        .order('day_number', { ascending: true })
        .order('time_period', { ascending: true })
        .order('order_index', { ascending: true });

      if (!activitiesError && activitiesData) {
        setActivities(activitiesData);
      }

      setLoading(false);
    };

    loadTrip();
  }, [params.id, router]);

  // Fetch destination image from Unsplash/Pixabay if no trip_image_url
  useEffect(() => {
    const handleFetchDestinationImage = async () => {
      if (!trip) return;
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

    handleFetchDestinationImage();
  }, [trip?.id, trip?.trip_image_url, trip?.destination]);

  // Reset image error when trip changes
  useEffect(() => {
    setImageError(false);
  }, [trip?.id, trip?.trip_image_url]);

  // Check if trip is bookmarked
  useEffect(() => {
    const checkBookmark = async () => {
      if (!trip) return;
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
  }, [trip?.id]);

  const handleCopyTrip = async () => {
    if (!trip) return;
    setCopying(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please login to copy trips");
        return;
      }

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
          title: `${trip.title} (Copy)`,
          description: trip.description,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          interests: trip.interests,
          trip_image_url: trip.trip_image_url,
          shared_to_social: false,
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
    if (!trip) return;
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

  const groupActivitiesByDay = () => {
    const grouped: Record<number, Activity[]> = {};
    activities.forEach(activity => {
      if (!grouped[activity.day_number]) {
        grouped[activity.day_number] = [];
      }
      grouped[activity.day_number].push(activity);
    });
    return grouped;
  };

  const timePeriodLabels: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transportation': return 'bg-yellow-100 text-yellow-800';
      case 'accommodation': return 'bg-blue-100 text-blue-800';
      case 'activity': return 'bg-green-100 text-green-800';
      case 'food': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-[1400px] mx-auto px-4 pt-20 pb-20">
            <div className="text-center py-20">Loading...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!trip) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-[1400px] mx-auto px-4 pt-20 pb-20">
            <div className="text-center py-20 text-gray-500">Trip not found</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const groupedActivities = groupActivitiesByDay();
  const days = Object.keys(groupedActivities).map(Number).sort((a, b) => a - b);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          <button
            onClick={() => router.push('/social')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Social
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex gap-6 items-stretch">
              {/* Trip Image */}
              {(trip.trip_image_url || dynamicImageUrl) && (
                <div className="relative w-64 flex-shrink-0 rounded-lg overflow-hidden">
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
              )}
              
              {/* Trip Information */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.title}</h1>
                    {trip.share_caption && (
                      <p className="text-gray-700 mb-4 font-medium text-lg">{trip.share_caption}</p>
                    )}
                    {trip.description && !trip.share_caption && (
                      <p className="text-gray-600 mb-4">{trip.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {trip.destination && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {trip.destination}
                        </div>
                      )}
                      {(trip.start_date || trip.end_date) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {trip.start_date && new Date(trip.start_date).toLocaleDateString()}
                          {trip.start_date && trip.end_date && ' - '}
                          {trip.end_date && new Date(trip.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {trip.interests && trip.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {trip.interests.map((interest, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {trip.author && (
                    <div 
                      className="flex items-center gap-2 ml-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedUserId(trip.owner_id)}
                    >
                      {trip.author.avatar_url && (
                        <img 
                          src={trip.author.avatar_url} 
                          alt={trip.author.name || 'User'} 
                          className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-[#ff5a58] transition-all" 
                        />
                      )}
                      <div className="text-sm">
                        <div className="font-medium hover:text-[#ff5a58] transition-colors">{trip.author.name || 'User'}</div>
                        <div className="text-gray-500">Creator</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons - below trip info */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={handleCopyTrip}
                    disabled={copying}
                    className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <img 
                      src="/assets/paw.svg" 
                      alt="Copy" 
                      className="w-4 h-4"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                    {copying ? 'Copying...' : 'Copy Trip'}
                  </button>
                  <button
                    onClick={toggleBookmark}
                    className={`flex items-center justify-center gap-1.5 border px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      bookmarked 
                        ? 'border-[#ff5a58] bg-[#ff5a58] text-white' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold mb-4">Itinerary</h2>
            {days.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activities planned</div>
            ) : (
              <div className="space-y-6">
                {days.map(day => (
                  <div key={day} className="border-l-2 border-gray-200 pl-4">
                    <h3 className="text-lg font-semibold mb-3">Day {day}</h3>
                    <div className="space-y-3">
                      {['morning', 'afternoon', 'evening'].map(period => {
                        const periodActivities = groupedActivities[day].filter(a => a.time_period === period);
                        if (periodActivities.length === 0) return null;
                        return (
                          <div key={period} className="mb-3">
                            <div className="text-sm font-medium text-gray-600 mb-2">{timePeriodLabels[period]}</div>
                            <div className="space-y-2">
                              {periodActivities.map(activity => (
                                <div key={activity.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{activity.title}</div>
                                      {activity.description && (
                                        <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                                      )}
                                      {activity.location && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {activity.location}
                                        </div>
                                      )}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ml-2 font-medium ${getTypeColor(activity.activity_type)}`}>
                                      {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                    </span>
                                  </div>
                                  {activity.link_url && (
                                    <div className="mt-3">
                                      <LinkPreview url={activity.link_url} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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


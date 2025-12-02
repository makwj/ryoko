"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ShareTripGuideModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  currentCaption?: string | null;
  isCurrentlyShared?: boolean;
  onShared: () => void;
}

export default function ShareTripGuideModal({
  open,
  onClose,
  tripId,
  currentCaption,
  isCurrentlyShared,
  onShared,
}: ShareTripGuideModalProps) {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [tripData, setTripData] = useState<{
    title: string;
    start_date: string | null;
    end_date: string | null;
    activityCount: number;
    trip_image_url: string | null;
    destination: string | null;
  } | null>(null);
  const [imageError, setImageError] = useState(false);
  const [dynamicImageUrl, setDynamicImageUrl] = useState<string | null>(null);

  const fetchTripData = async () => {
    try {
      // Fetch trip details
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('title, start_date, end_date, trip_image_url, destination')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Fetch activity count
      const { count, error: countError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId);

      if (countError) throw countError;

      setTripData({
        title: trip.title,
        start_date: trip.start_date,
        end_date: trip.end_date,
        activityCount: count || 0,
        trip_image_url: trip.trip_image_url || null,
        destination: trip.destination || null,
      });
      setImageError(false);
      
      // Fetch destination image if no user-uploaded image
      if (!trip.trip_image_url && trip.destination) {
        fetchDestinationImage(trip.destination);
      } else {
        setDynamicImageUrl(null);
      }
    } catch (error) {
      console.error('Error fetching trip data:', error);
    }
  };

  const fetchDestinationImage = async (destination: string) => {
    try {
      const locationParts = destination.split(',').map(part => part.trim());
      const city = locationParts[0];
      const country = locationParts[locationParts.length - 1];

      // Try Unsplash API first
      const unsplashKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
      if (unsplashKey) {
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)} ${encodeURIComponent(country)}&per_page=1&orientation=landscape&client_id=${unsplashKey}`
        );

        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json();
          if (unsplashData.results && unsplashData.results.length > 0) {
            setDynamicImageUrl(unsplashData.results[0].urls.regular);
            return;
          }
        }
      }

      // Fallback to Pixabay API
      const pixabayKey = process.env.NEXT_PUBLIC_PIXABAY_API_KEY;
      if (pixabayKey) {
        const pixabayResponse = await fetch(
          `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(city)} ${encodeURIComponent(country)}&image_type=photo&orientation=horizontal&category=places&per_page=3&safesearch=true`
        );

        if (pixabayResponse.ok) {
          const pixabayData = await pixabayResponse.json();
          if (pixabayData.hits && pixabayData.hits.length > 0) {
            setDynamicImageUrl(pixabayData.hits[0].webformatURL);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch destination image:', err);
    }
  };

  useEffect(() => {
    if (open) {
      setCaption(currentCaption || "");
      fetchTripData();
      setImageError(false);
      setDynamicImageUrl(null);
    } else {
      setCaption("");
      setTripData(null);
      setImageError(false);
      setDynamicImageUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentCaption, tripId]);

  const formatDateRange = () => {
    if (!tripData?.start_date && !tripData?.end_date) return 'No dates set';
    if (!tripData.start_date) return tripData.end_date ? new Date(tripData.end_date).toLocaleDateString() : 'No dates set';
    if (!tripData.end_date) return new Date(tripData.start_date).toLocaleDateString();
    
    const start = new Date(tripData.start_date);
    const end = new Date(tripData.end_date);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (start.getTime() === end.getTime()) {
      return startStr;
    }
    
    return `${startStr} - ${endStr}`;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          shared_to_social: true,
          share_caption: caption.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (error) throw error;

      toast.success('Trip shared as guide!');
      onShared();
      onClose();
    } catch (error) {
      console.error('Share trip error:', error);
      toast.error('Failed to share trip');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          shared_to_social: false,
          share_caption: null,
        })
        .eq('id', tripId);

      if (error) throw error;

      toast.success('Trip unshared');
      onShared();
      onClose();
    } catch (error) {
      console.error('Unshare trip error:', error);
      toast.error('Failed to unshare trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyShared ? 'Edit Trip Guide' : 'Share Trip as Guide'}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyShared ? 'Update your shared trip guide' : 'Share your trip guide with others'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Trip Card Preview */}
          {tripData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex gap-4">
                {/* Trip Image - Square on the left */}
                <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                  {(tripData.trip_image_url || dynamicImageUrl) && !imageError ? (
                    <img 
                      src={tripData.trip_image_url || dynamicImageUrl || ''} 
                      alt={tripData.title}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#ff5a58] to-[#ff4a47] flex items-center justify-center">
                      <span className="text-white text-xs font-medium text-center px-2">{tripData.title}</span>
                    </div>
                  )}
                </div>

                {/* Trip Details */}
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900">{tripData.title}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateRange()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{tripData.activityCount} {tripData.activityCount === 1 ? 'activity' : 'activities'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="caption" className="text-sm font-medium text-gray-700 mb-2 block">
              Caption
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption about your trip guide..."
              rows={6}
              className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#ff5a58]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Share what makes this trip special or why others should try it.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            {isCurrentlyShared && (
              <Button
                onClick={handleUnshare}
                disabled={loading}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Unshare
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white"
            >
              {loading ? 'Sharing...' : isCurrentlyShared ? 'Update' : 'Share Trip Guide'}
            </Button>
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


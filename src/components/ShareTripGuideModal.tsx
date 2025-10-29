"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  useEffect(() => {
    if (open) {
      setCaption(currentCaption || "");
    } else {
      setCaption("");
    }
  }, [open, currentCaption]);

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
        </DialogHeader>

        <div className="space-y-4 mt-4">
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


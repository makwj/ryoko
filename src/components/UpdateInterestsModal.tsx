"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpdateInterestsModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  currentInterests: string[];
  onInterestsUpdated: (interests: string[]) => void;
}

const interestCategories = [
  "Adventure", "Food", "Culture", "Shopping", "Art", "Relaxation",
  "History", "Photography", "Music", "Sports", "Nature", "Nightlife"
];

export default function UpdateInterestsModal({ 
  open, 
  onClose, 
  tripId, 
  currentInterests, 
  onInterestsUpdated 
}: UpdateInterestsModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentInterests);

  const toggleInterest = (interest: string) => {
    const updatedInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    setSelectedInterests(updatedInterests);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('trips')
        .update({ interests: selectedInterests })
        .eq('id', tripId);

      if (error) throw error;

      toast.success('Interests updated successfully!');
      onInterestsUpdated(selectedInterests);
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-dark">Update Group Interests</DialogTitle>
        </DialogHeader>
        
        <p className="text-gray-600 text-sm mb-8">
          Get personalized recommendations from our smart recommendation system
        </p>
        
        <div className="grid grid-cols-3 gap-3 mb-8">
          {interestCategories.map((interest) => (
            <Button
              key={interest}
              onClick={() => toggleInterest(interest)}
              variant={selectedInterests.includes(interest) ? "default" : "outline"}
              className={`h-12 px-3 text-sm font-medium ${
                selectedInterests.includes(interest)
                  ? 'bg-[#ff5a58] text-white hover:bg-[#ff4a47]'
                  : 'hover:bg-gray-200'
              }`}
            >
              {interest}
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white"
          >
            {loading ? "Updating..." : "Update Interests"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

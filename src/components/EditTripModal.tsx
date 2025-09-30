"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X, Calendar, FileText } from "lucide-react";
import toast from "react-hot-toast";
import LocationAutocomplete from "./LocationAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditTripModalProps {
  open: boolean;
  onClose: () => void;
  trip: {
    id: string;
    title: string;
    destination?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  };
  onTripUpdated: () => void;
}

interface TripFormData {
  title: string;
  destination: string;
  description: string;
  start_date: string;
  end_date: string;
}

export default function EditTripModal({ 
  open, 
  onClose, 
  trip,
  onTripUpdated 
}: EditTripModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TripFormData>({
    title: '',
    destination: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (open && trip) {
      setFormData({
        title: trip.title || '',
        destination: trip.destination || '',
        description: trip.description || '',
        start_date: trip.start_date ? trip.start_date.split('T')[0] : '',
        end_date: trip.end_date ? trip.end_date.split('T')[0] : ''
      });
    }
  }, [open, trip]);

  const handleInputChange = (field: keyof TripFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a trip title');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          title: formData.title.trim(),
          destination: formData.destination.trim() || null,
          description: formData.description.trim() || null,
          start_date: formData.start_date,
          end_date: formData.end_date
        })
        .eq('id', trip.id);

      if (error) throw error;

      toast.success('Trip updated successfully!');
      onTripUpdated();
      onClose();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
            
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              {/* Trip Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Trip Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Amazing Rome Adventure"
                  required
                />
              </div>

              {/* Destination */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Destination
                </Label>
                <LocationAutocomplete
                  value={formData.destination}
                  onChange={(value) => handleInputChange("destination", value)}
                  placeholder="Where are you going?"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date" className="text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange("start_date", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date" className="text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date *
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange("end_date", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="h-20 resize-none"
                  placeholder="Add a description for your trip..."
                  rows={2}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.title.trim() || !formData.start_date || !formData.end_date}
                className="flex-1 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  'Update Trip'
                )}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X, Clock, MapPin, FileText, Plus, Upload, Trash2, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MoveToItineraryModalProps {
  open: boolean;
  onClose: () => void;
  idea: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    tags: string[];
    link_url?: string;
    trip_id: string;
  };
  tripDays: number;
  onActivityAdded: () => void;
  onIdeaRemoved: () => void;
}

interface FileWithCustomName {
  file: File;
  customName: string;
}

interface ActivityFormData {
  day: number;
  title: string;
  description: string;
  activity_time: string;
  location: string;
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food';
  note: string;
  attachments: FileWithCustomName[];
}

const activityTypes = [
  { value: 'transportation', label: 'Transportation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accommodation', label: 'Accommodation', color: 'bg-blue-100 text-blue-800' },
  { value: 'activity', label: 'Activity', color: 'bg-green-100 text-green-800' },
  { value: 'food', label: 'Food', color: 'bg-orange-100 text-orange-800' }
];

export default function MoveToItineraryModal({ 
  open, 
  onClose, 
  idea,
  tripDays,
  onActivityAdded,
  onIdeaRemoved 
}: MoveToItineraryModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    day: 1,
    title: '',
    description: '',
    activity_time: '09:00',
    location: '',
    activity_type: 'activity',
    note: '',
    attachments: []
  });

  useEffect(() => {
    if (open && idea) {
      // Map first tag to activity type (or default to activity)
      const firstTag = idea.tags[0] || 'other';
      const categoryMapping: Record<string, 'food' | 'transportation' | 'accommodation' | 'activity'> = {
        'food': 'food',
        'transportation': 'transportation',
        'accommodation': 'accommodation',
        'activity': 'activity',
        'shopping': 'activity',
        'nature': 'activity',
        'history': 'activity',
        'culture': 'activity',
        'other': 'activity'
      };

      setFormData({
        day: 1,
        title: idea.title,
        description: idea.description || '',
        activity_time: '09:00',
        location: idea.location || '',
        activity_type: categoryMapping[firstTag] || 'activity',
        note: idea.link_url ? `Source: ${idea.link_url}` : '',
        attachments: []
      });
    }
  }, [open, idea]);

  const handleInputChange = (field: keyof ActivityFormData, value: string | number | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const filesWithCustomNames: FileWithCustomName[] = files.map(file => ({
        file,
        customName: '' // Empty by default for better UX
      }));
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...filesWithCustomNames] }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      attachments: prev.attachments.filter((_, i) => i !== index) 
    }));
  };

  const updateFileName = (index: number, newName: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.map((item, i) => 
        i === index ? { ...item, customName: newName } : item
      )
    }));
  };

  const uploadFiles = async (filesWithNames: FileWithCustomName[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const { file, customName } of filesWithNames) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `trip-attachments/${idea.trip_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('trip-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('trip-files')
        .getPublicUrl(filePath);

      uploadedUrls.push(JSON.stringify({
        url: publicUrl,
        customName: customName || file.name
      }));
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter an activity title');
      return;
    }

    setLoading(true);

    try {
      // Upload files if any
      let attachments: string[] = [];
      if (formData.attachments.length > 0) {
        setUploadingFiles(true);
        attachments = await uploadFiles(formData.attachments);
      }

      // Get the next order index for the day
      const { data: activities } = await supabase
        .from('activities')
        .select('order_index')
        .eq('trip_id', idea.trip_id)
        .eq('day_number', formData.day)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = activities && activities.length > 0 
        ? (activities[0].order_index || 0) + 1 
        : 1;

      // Create the activity
      const { error } = await supabase
        .from('activities')
        .insert([
          {
            trip_id: idea.trip_id,
            day_number: formData.day,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            activity_time: formData.activity_time || null,
            location: formData.location.trim() || null,
            activity_type: formData.activity_type,
            note: formData.note.trim() || null,
            attachments: attachments.length > 0 ? attachments : null,
            order_index: nextOrderIndex
          }
        ]);

      if (error) throw error;

      // Delete the idea
      const { error: deleteError } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id);

      if (deleteError) throw deleteError;

      toast.success('Idea moved to itinerary successfully!');
      onActivityAdded();
      onIdeaRemoved();
      onClose();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-dark">Move Idea to Itinerary</DialogTitle>
        </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
              {/* Day Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Select Day *
                </Label>
                <Select value={formData.day.toString()} onValueChange={(value) => handleInputChange("day", parseInt(value))}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>Day {day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Title */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Activity Title *
                </Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full h-12"
                  placeholder="e.g., Visit Colosseum"
                  required
                />
              </div>

              {/* Activity Type */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Activity Type
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {activityTypes.map((type) => (
                    <Button
                      key={type.value}
                      onClick={() => handleInputChange("activity_type", type.value)}
                      variant={formData.activity_type === type.value ? "default" : "outline"}
                      className={`h-12 px-3 text-sm font-medium ${
                        formData.activity_type === type.value
                          ? `${type.color} border-2 border-current`
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="time"
                      value={formData.activity_time}
                      onChange={(e) => handleInputChange("activity_time", e.target.value)}
                      className="w-full h-12 pl-10 pr-4"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="w-full h-12 pl-10 pr-4"
                      placeholder="e.g., Colosseum, Rome"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="w-full h-20 resize-none"
                  placeholder="Add details about this activity..."
                  rows={2}
                />
              </div>

              {/* Note */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Note
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Textarea
                    value={formData.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    className="w-full h-16 pl-10 pr-4 py-3 resize-none"
                    placeholder="Add any important notes..."
                    rows={1}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Attachments
                </Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                  
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      {formData.attachments.map((fileWithName, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                              type="text"
                              value={fileWithName.customName}
                              onChange={(e) => updateFileName(index, e.target.value)}
                              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 truncate"
                              placeholder="Enter file name"
                            />
                            <span className="text-xs text-gray-400">
                              ({fileWithName.file.name})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              onClick={() => removeFile(index)}
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-500"
                              title="Remove file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                disabled={loading || !formData.title.trim()}
                className="flex-1 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {uploadingFiles ? "Uploading files..." : "Moving to itinerary..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Move to Itinerary
                  </>
                )}
              </Button>
            </div>
        </DialogContent>
    </Dialog>
  );
}
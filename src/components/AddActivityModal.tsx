"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X, Clock, MapPin, FileText, Plus, Upload, Trash2, Edit3, Sunrise, Sun, Moon, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { hasUrls } from "@/lib/linkUtils";

interface AddActivityModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  dayNumber: number;
  onActivityAdded: (activity?: { title: string; dayNumber: number }) => void;
}

interface FileWithCustomName {
  file: File;
  customName: string;
}

interface ActivityFormData {
  title: string;
  description: string;
  time_period: 'morning' | 'afternoon' | 'evening';
  location: string;
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food' | 'shopping' | 'entertainment' | 'other';
  note: string;
  link_url: string;
  attachments: FileWithCustomName[];
}

const activityTypes = [
  { value: 'transportation', label: 'Transportation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accommodation', label: 'Accommodation', color: 'bg-blue-100 text-blue-800' },
  { value: 'activity', label: 'Activity', color: 'bg-green-100 text-green-800' },
  { value: 'food', label: 'Food', color: 'bg-orange-100 text-orange-800' },
  { value: 'shopping', label: 'Shopping', color: 'bg-pink-100 text-pink-800' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];

const timePeriods = [
  { value: 'morning', label: 'Morning', icon: <Sunrise className="w-4 h-4" /> },
  { value: 'afternoon', label: 'Afternoon', icon: <Sun className="w-4 h-4" /> },
  { value: 'evening', label: 'Evening', icon: <Moon className="w-4 h-4" /> }
];

export default function AddActivityModal({ 
  open, 
  onClose, 
  tripId, 
  dayNumber, 
  onActivityAdded 
}: AddActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    time_period: 'morning',
    location: '',
    activity_type: 'activity',
    note: '',
    link_url: '',
    attachments: []
  });

  const handleInputChange = (field: keyof ActivityFormData, value: string | File[]) => {
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
      const filePath = `trip-attachments/${tripId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('trip-files')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Failed to upload ${customName}: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('trip-files')
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
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
      let attachments: {url: string, customName: string}[] = [];
      if (formData.attachments.length > 0) {
        setUploadingFiles(true);
        const uploadedUrls = await uploadFiles(formData.attachments);
        attachments = uploadedUrls.map((url, index) => ({
          url,
          customName: formData.attachments[index]?.customName || ''
        }));
        setUploadingFiles(false);
      }

      // Get the next order index for this day
      const { data: lastActivity } = await supabase
        .from('activities')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('day_number', dayNumber)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrderIndex = lastActivity ? lastActivity.order_index + 1 : 0;

      const { error } = await supabase
        .from('activities')
        .insert([
          {
            trip_id: tripId,
            day_number: dayNumber,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            time_period: formData.time_period,
            location: formData.location.trim() || null,
            activity_type: formData.activity_type,
            note: formData.note.trim() || null,
            link_url: formData.link_url.trim() || null,
            attachments: attachments.length > 0 ? attachments : null,
            order_index: nextOrderIndex
          }
        ]);

      if (error) throw error;

      toast.success('Activity added successfully!');
      onActivityAdded({ title: formData.title, dayNumber });
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        time_period: 'morning',
        location: '',
        activity_type: 'activity',
        note: '',
        link_url: '',
        attachments: []
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Activity - Day {dayNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            
            <div className="space-y-4">
              {/* Activity Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Activity Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Visit Colosseum"
                  required
                />
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activity-type" className="text-sm font-medium text-gray-700">
                  Activity Type
                </Label>
                <Select value={formData.activity_type} onValueChange={(value) => handleInputChange("activity_type", value)}>
                  <SelectTrigger id="activity-type">
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={type.color}>{type.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time_period" className="text-sm font-medium text-gray-700">
                    Time Period
                  </Label>
                  <Select
                    value={formData.time_period}
                    onValueChange={(value) => handleInputChange("time_period", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      {timePeriods.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          <div className="flex items-center gap-2">
                            {period.icon}
                            <span>{period.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="pl-10"
                      placeholder="e.g., Colosseum, Rome"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="h-24 resize-none"
                  placeholder="Add details about this activity..."
                  rows={3}
                />
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="note" className="text-sm font-medium text-gray-700">
                  Note
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    className="h-20 pl-10 resize-none"
                    placeholder="Add any important notes..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Link */}
              <div>
                <Label htmlFor="link_url" className="text-sm font-medium text-gray-700">
                  Link
                </Label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="link_url"
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => handleInputChange("link_url", e.target.value)}
                    className="pl-10"
                    placeholder="https://example.com"
                  />
                </div>
                {formData.link_url && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Link will be displayed as a preview card in the activity
                  </p>
                )}
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
                              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 truncate h-auto p-0"
                              placeholder={fileWithName.file.name}
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
                              className="text-gray-400 hover:text-red-500 p-1 h-auto"
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
            <div className="flex gap-3 mt-8">
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
                className="flex-1 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {uploadingFiles ? "Uploading files..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Activity
                  </>
                )}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

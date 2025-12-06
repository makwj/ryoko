"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Clock, MapPin, FileText, Plus, Upload, Trash2, Edit3, Sunrise, Sun, Moon, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

  // Reset loading state when modal closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setUploadingFiles(false);
    }
  }, [open]);

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
    
    if (!tripId) {
      throw new Error('Trip ID is missing. Cannot upload files.');
    }
    
    for (const { file, customName } of filesWithNames) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `trip-attachments/${tripId}/${fileName}`;

        // Create upload promise with timeout
        const uploadPromise = supabase.storage
          .from('trip-files')
          .upload(filePath, file);

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('File upload timed out')), 20000); // 20 second timeout per file
        });

        const { error: uploadError } = await Promise.race([
          uploadPromise,
          timeoutPromise.then(() => { throw new Error('Upload timeout'); })
        ]) as { error: any };

        if (uploadError) {
          console.error('File upload error:', uploadError);
          if (uploadError.message?.includes('duplicate') || uploadError.message?.includes('already exists')) {
            // File already exists, try to get existing URL
            const { data: existingUrl } = supabase.storage
              .from('trip-files')
              .getPublicUrl(filePath);
            if (existingUrl?.publicUrl) {
              uploadedUrls.push(existingUrl.publicUrl);
              continue;
            }
          }
          throw new Error(`Failed to upload ${customName || file.name}: ${uploadError.message || 'Unknown error'}`);
        }

        const { data } = supabase.storage
          .from('trip-files')
          .getPublicUrl(filePath);

        if (!data?.publicUrl) {
          throw new Error(`Failed to get public URL for ${customName || file.name}`);
        }

        uploadedUrls.push(data.publicUrl);
      } catch (error) {
        console.error(`Error uploading file ${customName || file.name}:`, error);
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter an activity title');
      return;
    }

    if (!tripId) {
      toast.error('Trip ID is missing. Please refresh the page and try again.');
      return;
    }

    // Validate and normalize URL if provided
    let normalizedLinkUrl = formData.link_url.trim();
    if (normalizedLinkUrl) {
      try {
        // If it doesn't start with http/https, add https://
        if (!normalizedLinkUrl.startsWith('http://') && !normalizedLinkUrl.startsWith('https://')) {
          normalizedLinkUrl = `https://${normalizedLinkUrl}`;
        }
        // Validate URL format
        new URL(normalizedLinkUrl);
      } catch (error) {
        toast.error('Please enter a valid URL');
        return;
      }
    }

    setLoading(true);
    setUploadingFiles(false);

    // Helper function to create timeout promise
    const createTimeout = (duration: number, message: string) => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), duration);
      });
    };

    try {
      // Upload files if any (with separate timeout - 60 seconds for file uploads)
      let attachments: {url: string, customName: string}[] = [];
      if (formData.attachments.length > 0) {
        setUploadingFiles(true);
        try {
          const uploadedUrls = await Promise.race([
            uploadFiles(formData.attachments),
            createTimeout(60000, 'File upload timed out. Large files may take longer. Please try again or reduce file size.')
          ]);
          attachments = uploadedUrls.map((url, index) => ({
            url,
            customName: formData.attachments[index]?.customName || ''
          }));
        } catch (uploadError) {
          const uploadErrorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload files";
          throw new Error(`File upload failed: ${uploadErrorMessage}`);
        } finally {
          setUploadingFiles(false);
        }
      }

      // Get the next order index for this day (with separate timeout - 15 seconds)
      let nextOrderIndex = 0;
      try {
        const orderIndexQuery = Promise.race([
          supabase
            .from('activities')
            .select('order_index')
            .eq('trip_id', tripId)
            .eq('day_number', dayNumber)
            .order('order_index', { ascending: false })
            .limit(1)
            .single(),
          createTimeout(15000, 'Query timed out')
        ]) as Promise<{ data: any; error: any }>;

        const { data: lastActivity, error: queryError } = await orderIndexQuery;
        
        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
          console.error('Error fetching last activity order:', queryError);
          // Continue with order_index 0 if query fails
        } else if (lastActivity) {
          nextOrderIndex = lastActivity.order_index + 1;
        }
      } catch (queryTimeoutError) {
        console.warn('Order index query timed out, using default order_index 0');
        // Continue with order_index 0
      }

      // Insert activity (with separate timeout - 30 seconds)
      const insertPromise = supabase
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
            link_url: normalizedLinkUrl || null,
            attachments: attachments.length > 0 ? attachments : null,
            order_index: nextOrderIndex
          }
        ]);

      const insertResult = await Promise.race([
        insertPromise,
        createTimeout(30000, 'Database operation timed out. Please check your connection and try again.')
      ]);

      const { error: insertError } = insertResult as { data: any; error: any };

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        
        // Provide more specific error messages
        if (insertError.code === '23503') {
          throw new Error('Invalid trip or day number. Please refresh the page and try again.');
        } else if (insertError.code === '23505') {
          throw new Error('This activity already exists. Please refresh the page.');
        } else if (insertError.code === '42501') {
          throw new Error('Permission denied. You may not have access to add activities to this trip.');
        } else if (insertError.message) {
          throw new Error(`Failed to add activity: ${insertError.message}`);
        } else {
          throw new Error('Failed to add activity. Please try again.');
        }
      }

      // If there's no error, the insert was successful
      // Supabase doesn't return data by default unless .select() is chained
      // We don't need the data since we refresh activities via onActivityAdded()
      toast.success('Activity added successfully!');
      
      // Store title before resetting form
      const activityTitle = formData.title.trim();
      
      // Reset form before closing
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
      
      onActivityAdded({ title: activityTitle, dayNumber });
      onClose();
    } catch (error: unknown) {
      console.error('Error adding activity:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Reset form when closing
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
        onClose();
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg text-center">Adding an activity for Day {dayNumber}</DialogTitle>
          <DialogDescription className="text-center">
            Fill in the details for your activity on day {dayNumber}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
            
            <div className="space-y-6">
              {/* Activity Title */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span>Activity Title</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                    Required
                  </span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="What are you doing today?"
                  className="focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                  required
                />
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activity-type" className="text-sm font-medium text-gray-700">
                  Activity Type
                </Label>
                <Select value={formData.activity_type} onValueChange={(value) => handleInputChange("activity_type", value)}>
                  <SelectTrigger id="activity-type" className="mt-2 cursor-pointer focus-visible:ring-[#ff5a58] focus-visible:ring-1">
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
                    <SelectTrigger className="w-full mt-2 cursor-pointer focus-visible:ring-[#ff5a58] focus-visible:ring-2">
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      {timePeriods.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                    Location
                  </Label>
                  <div className="relative mt-2">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="pl-10 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
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
                  className="h-24 resize-none mt-2 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                  placeholder="Add details about this activity..."
                  rows={3}
                />
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="note" className="text-sm font-medium text-gray-700">
                  Note
                </Label>
                <div className="relative mt-2">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none z-0" />
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    className="h-20 pl-10 resize-none focus-visible:ring-[#ff5a58] focus-visible:ring-2 relative z-10"
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
                <div className="relative mt-2">
                  <ExternalLink className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="link_url"
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => handleInputChange("link_url", e.target.value)}
                    className="pl-10 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
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
                      className="flex-1 h-12 cursor-pointer"
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
                              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 truncate h-auto p-0 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
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
                              className="text-gray-400 hover:text-red-500 p-1 h-auto cursor-pointer"
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
                className="flex-1 h-12 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }}
                type="button"
                disabled={loading || !formData.title.trim()}
                className="flex-1 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium cursor-pointer"
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

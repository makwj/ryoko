"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X, Clock, MapPin, FileText, Upload, Trash2, Edit, Edit3 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface EditActivityModalProps {
  open: boolean;
  onClose: () => void;
  activity: {
    id: string;
    title: string;
    description: string;
    activity_time: string;
    location: string;
    activity_type: 'transportation' | 'accommodation' | 'activity' | 'food';
    note?: string;
    attachments?: (string | {url: string, customName: string})[];
  };
  onActivityUpdated: () => void;
}

interface FileWithCustomName {
  file: File;
  customName: string;
}

interface ExistingFile {
  url: string;
  customName: string;
}

interface ActivityFormData {
  title: string;
  description: string;
  activity_time: string;
  location: string;
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food';
    note?: string;
  attachments: FileWithCustomName[];
  existingAttachments: ExistingFile[];
}

const activityTypes = [
  { value: 'transportation', label: 'Transportation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accommodation', label: 'Accommodation', color: 'bg-blue-100 text-blue-800' },
  { value: 'activity', label: 'Activity', color: 'bg-green-100 text-green-800' },
  { value: 'food', label: 'Food', color: 'bg-orange-100 text-orange-800' }
];

export default function EditActivityModal({ 
  open, 
  onClose, 
  activity, 
  onActivityUpdated 
}: EditActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    activity_time: '',
    location: '',
    activity_type: 'activity',
    note: '',
    attachments: [],
    existingAttachments: []
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title,
        description: activity.description || '',
        activity_time: activity.activity_time || '',
        location: activity.location || '',
        activity_type: activity.activity_type,
        note: activity.note || '',
        attachments: [],
        existingAttachments: (activity.attachments || []).map(attachment => {
          // Handle both old format (string array) and new format (object array)
          if (typeof attachment === 'string') {
            return {
              url: attachment,
              customName: '' // Empty by default for better UX
            };
          } else {
            return {
              url: attachment.url,
              customName: attachment.customName || '' // Empty by default for better UX
            };
          }
        })
      });
    }
  }, [activity]);

  const handleInputChange = (field: keyof ActivityFormData, value: string | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const filesWithCustomNames: FileWithCustomName[] = files.map(file => ({
        file,
        customName: file.name
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

  const removeExistingAttachment = async (index: number) => {
    const attachmentToRemove = formData.existingAttachments[index];
    
    // Delete file from storage
    if (attachmentToRemove.url) {
      await deleteFileFromStorage(attachmentToRemove.url);
    }
    
    // Remove from form data
    setFormData(prev => ({ 
      ...prev, 
      existingAttachments: prev.existingAttachments.filter((_, i) => i !== index) 
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

  const updateExistingFileName = (index: number, newName: string) => {
    setFormData(prev => ({
      ...prev,
      existingAttachments: prev.existingAttachments.map((item, i) => 
        i === index ? { ...item, customName: newName } : item
      )
    }));
  };

  const deleteFileFromStorage = async (fileUrl: string) => {
    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[pathParts.length - 3]; // trip-files
      const filePath = pathParts.slice(-2).join('/'); // trip-attachments/activity-id/filename
      
      const { error } = await supabase.storage
        .from('trip-files')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        // Don't throw error to prevent blocking the UI
      }
    } catch (error) {
      console.error('Error parsing file URL:', error);
    }
  };

  const uploadFiles = async (filesWithNames: FileWithCustomName[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const { file, customName } of filesWithNames) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `trip-attachments/${activity.id}/${fileName}`;

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
      // Upload new files if any
      let newAttachmentUrls: string[] = [];
      if (formData.attachments.length > 0) {
        setUploadingFiles(true);
        newAttachmentUrls = await uploadFiles(formData.attachments);
        setUploadingFiles(false);
      }

      // Combine existing and new attachments as objects
      const existingAttachments = formData.existingAttachments.map(item => ({
        url: item.url,
        customName: item.customName || ''
      }));
      
      const newAttachments = newAttachmentUrls.map((url, index) => ({
        url,
        customName: formData.attachments[index]?.customName || ''
      }));
      
      const allAttachments = [...existingAttachments, ...newAttachments];

      const { error } = await supabase
        .from('activities')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          activity_time: formData.activity_time || null,
          location: formData.location.trim() || null,
          activity_type: formData.activity_type,
          note: formData.note.trim() || null,
          attachments: allAttachments.length > 0 ? allAttachments : null,
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast.success('Activity updated successfully!');
      onActivityUpdated();
      onClose();
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
          <DialogTitle>Edit Activity</DialogTitle>
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
                  <Label htmlFor="time" className="text-sm font-medium text-gray-700">
                    Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="time"
                      type="time"
                      value={formData.activity_time}
                      onChange={(e) => handleInputChange("activity_time", e.target.value)}
                      className="pl-10"
                    />
                  </div>
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
                  
                  {/* Existing Attachments */}
                  {formData.existingAttachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Existing attachments:</p>
                      {formData.existingAttachments.map((fileWithName, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                              type="text"
                              value={fileWithName.customName}
                              onChange={(e) => updateExistingFileName(index, e.target.value)}
                              className="flex-1 bg-transparent border-none outline-none text-sm text-blue-600 truncate h-auto p-0"
                              placeholder={fileWithName.url.split('/').pop() || 'Enter file name'}
                            />
                            <a 
                              href={fileWithName.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-600"
                            >
                              (view)
                            </a>
                          </div>
                          <Button
                            onClick={() => removeExistingAttachment(index)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-500 p-1 h-auto ml-2"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* New Files */}
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">New files to upload:</p>
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
                          <Button
                            onClick={() => removeFile(index)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-500 p-1 h-auto ml-2"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                    {uploadingFiles ? "Uploading files..." : "Updating..."}
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Activity
                  </>
                )}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

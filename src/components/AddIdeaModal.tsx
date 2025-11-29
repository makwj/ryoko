"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AddIdeaModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  onIdeaAdded: (ideaData?: { title: string }) => void;
}

interface IdeaFormData {
  title: string;
  description: string;
  location: string;
  linkUrl: string;
  tags: string[];
}

const ideaCategories = [
  { value: 'food', label: 'Food', color: 'bg-green-100 text-green-800' },
  { value: 'transportation', label: 'Transportation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accommodation', label: 'Accommodation', color: 'bg-blue-100 text-blue-800' },
  { value: 'activity', label: 'Activity', color: 'bg-purple-100 text-purple-800' },
  { value: 'shopping', label: 'Shopping', color: 'bg-pink-100 text-pink-800' },
  { value: 'nature', label: 'Nature', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'history', label: 'History', color: 'bg-amber-100 text-amber-800' },
  { value: 'culture', label: 'Culture', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-dark-medium' }
];

export default function AddIdeaModal({ 
  open, 
  onClose, 
  tripId,
  onIdeaAdded 
}: AddIdeaModalProps) {
  const [formData, setFormData] = useState<IdeaFormData>({
    title: '',
    description: '',
    location: '',
    linkUrl: '',
    tags: ['other']
  });
  const [loading, setLoading] = useState(false);
  const [linkPreview, setLinkPreview] = useState<{
    title: string;
    description: string;
    image: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleInputChange = (field: keyof IdeaFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tagValue: string) => {
    setFormData(prev => {
      const currentTags = prev.tags;
      if (currentTags.includes(tagValue)) {
        // Remove tag if it's already selected
        return { ...prev, tags: currentTags.filter(tag => tag !== tagValue) };
      } else {
        // Add tag if it's not selected
        return { ...prev, tags: [...currentTags, tagValue] };
      }
    });
  };

  const fetchLinkPreview = async (url: string) => {
    if (!url || !url.startsWith('http')) return;
    
    setPreviewLoading(true);
    try {
      // This is a simplified link preview - in production you'd want to use a proper link preview service
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        setLinkPreview(data);
      }
    } catch (error) {
      console.log('Link preview not available');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLinkUrlChange = (url: string) => {
    handleInputChange('linkUrl', url);
    if (url && url.startsWith('http')) {
      fetchLinkPreview(url);
    } else {
      setLinkPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter an idea title');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('ideas')
        .insert({
          trip_id: tripId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          link_url: formData.linkUrl.trim() || null,
          link_title: linkPreview?.title || null,
          link_description: linkPreview?.description || null,
          link_image: linkPreview?.image || null,
          tags: formData.tags,
          added_by: user.id
        });

      if (error) throw error;

      toast.success('Idea added successfully!');
      onIdeaAdded({ title: formData.title });
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        linkUrl: '',
        tags: ['other']
      });
      setLinkPreview(null);
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
          <DialogTitle className="text-lg text-center">Add an Idea</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Idea Title
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Colosseum, Pane e Salame"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="resize-none"
              rows={3}
              placeholder="Brief description of the idea..."
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-sm font-medium text-gray-700">
              Location
            </Label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Rome, Italy"
            />
          </div>

          {/* Link URL */}
          <div>
            <Label htmlFor="linkUrl" className="text-sm font-medium text-gray-700">
              Link URL
            </Label>
            <Input
              id="linkUrl"
              type="url"
              value={formData.linkUrl}
              onChange={(e) => handleLinkUrlChange(e.target.value)}
              placeholder="https://example.com"
            />
            
            {/* Link Preview */}
            {previewLoading && (
              <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            )}
            
            {linkPreview && !previewLoading && (
              <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex gap-3">
                  {linkPreview.image && (
                    <img 
                      src={linkPreview.image} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-dark text-sm">{linkPreview.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{linkPreview.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
               Add Tags (optional)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ideaCategories.map((category) => (
                <Button
                  key={category.value}
                  onClick={() => handleTagToggle(category.value)}
                  variant={formData.tags.includes(category.value) ? 'default' : 'outline'}
                  className={`cursor-pointer py-2 px-4 rounded-full text-sm font-medium ${
                    formData.tags.includes(category.value)
                      ? 'bg-[#ff5a58] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{category.label}</span>
                  </div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select multiple tags to categorize your idea
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="cursor-pointer flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Idea'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

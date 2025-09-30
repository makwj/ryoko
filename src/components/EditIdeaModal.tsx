"use client";

import { useState, useEffect } from "react";
import { X, Link, Tag, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface EditIdeaModalProps {
  open: boolean;
  onClose: () => void;
  idea: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    link_url?: string;
    tags: string[];
  };
  onIdeaUpdated: () => void;
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

export default function EditIdeaModal({ 
  open, 
  onClose, 
  idea,
  onIdeaUpdated 
}: EditIdeaModalProps) {
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

  useEffect(() => {
    if (open && idea) {
      setFormData({
        title: idea.title,
        description: idea.description || '',
        location: idea.location || '',
        linkUrl: idea.link_url || '',
        tags: idea.tags || ['other']
      });
      
      // Fetch link preview if there's a URL
      if (idea.link_url) {
        fetchLinkPreview(idea.link_url);
      }
    }
  }, [open, idea]);

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
      const { error } = await supabase
        .from('ideas')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          link_url: formData.linkUrl.trim() || null,
          link_title: linkPreview?.title || null,
          link_description: linkPreview?.description || null,
          link_image: linkPreview?.image || null,
          tags: formData.tags
        })
        .eq('id', idea.id);

      if (error) throw error;

      toast.success('Idea updated successfully!');
      onIdeaUpdated();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', idea.id);

      if (error) throw error;

      toast.success('Idea deleted successfully!');
      onIdeaUpdated();
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
          <DialogTitle>Edit Idea</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Idea Title *
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
              <MapPin className="w-4 h-4 inline mr-1" />
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
              <Link className="w-4 h-4 inline mr-1" />
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
              <Tag className="w-4 h-4 inline mr-1" />
              Tags *
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ideaCategories.map((category) => (
                <Button
                  key={category.value}
                  onClick={() => handleTagToggle(category.value)}
                  variant={formData.tags.includes(category.value) ? 'default' : 'outline'}
                  className={`p-3 ${
                    formData.tags.includes(category.value)
                      ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
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
            onClick={handleDelete}
            disabled={loading}
            variant="destructive"
            className="px-4 py-3 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
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
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

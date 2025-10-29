"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    content: string;
    country_name?: string | null;
    images?: Array<{ id: string; image_path: string; order_index: number }>;
  };
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
}

export default function EditPostModal({ isOpen, onClose, post, onPostUpdated, onPostDeleted }: EditPostModalProps) {
  const [content, setContent] = useState("");
  const [countryName, setCountryName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; image_path: string; order_index: number }>>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Get country code from country name
  const getCountryCodeFromName = (name: string): string | null => {
    if (!name) return null;
    const countryMap: Record<string, string> = {
      'United States': 'US', 'United Kingdom': 'GB', 'Japan': 'JP', 'South Korea': 'KR', 'China': 'CN',
      'Thailand': 'TH', 'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID', 'Philippines': 'PH',
      'Vietnam': 'VN', 'India': 'IN', 'Australia': 'AU', 'New Zealand': 'NZ', 'France': 'FR',
      'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Portugal': 'PT', 'Greece': 'GR', 'Turkey': 'TR',
      'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', 'Egypt': 'EG', 'South Africa': 'ZA',
      'Brazil': 'BR', 'Mexico': 'MX', 'Argentina': 'AR', 'Chile': 'CL', 'Canada': 'CA',
    };
    return countryMap[name] || null;
  };

  useEffect(() => {
    if (isOpen && post) {
      setContent(post.content || "");
      setCountryName(post.country_name || "");
      setExistingImages(post.images || []);
      setFiles([]);
      setImagesToDelete([]);
    }
  }, [isOpen, post]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setImagesToDelete([...imagesToDelete, imageId]);
    setExistingImages(existingImages.filter(img => img.id !== imageId));
  };

  const handleSubmit = async () => {
    if (!content.trim() && existingImages.length === 0 && files.length === 0) {
      toast.error("Post must have content or images");
      return;
    }

    setUploading(true);
    try {
      // Delete marked images
      if (imagesToDelete.length > 0) {
        // Delete from storage
        const { data: imagesData } = await supabase
          .from('post_images')
          .select('image_path')
          .in('id', imagesToDelete);
        
        if (imagesData) {
          for (const img of imagesData) {
            await supabase.storage.from('post-images').remove([img.image_path]);
          }
        }

        // Delete from database
        await supabase
          .from('post_images')
          .delete()
          .in('id', imagesToDelete);
      }

      // Derive country code from name
      const derivedCountryCode = countryName.trim() ? getCountryCodeFromName(countryName.trim()) : null;

      // Update post
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          country_code: derivedCountryCode,
          country_name: countryName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (updateError) throw updateError;

      // Upload new images
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const objectPath = `posts/${post.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('post-images').upload(objectPath, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadErr) throw uploadErr;
        
        const maxOrderIndex = existingImages.length > 0 
          ? Math.max(...existingImages.map(img => img.order_index || 0))
          : -1;
        
        await supabase.from('post_images').insert({
          post_id: post.id,
          image_path: objectPath,
          order_index: maxOrderIndex + i + 1,
        });
      }

      toast.success("Post updated successfully!");
      onPostUpdated?.();
      onClose();
    } catch (error) {
      console.error('Update post error:', error);
      toast.error("Failed to update post");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setUploading(true);
    try {
      // Delete all images from storage first
      if (post.images && post.images.length > 0) {
        const imagePaths = post.images.map(img => img.image_path);
        for (const path of imagePaths) {
          await supabase.storage.from('post-images').remove([path]);
        }
      }

      // Delete post (cascade will delete images and reactions)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast.success("Post deleted successfully!");
      onPostDeleted?.();
      onClose();
    } catch (error) {
      console.error('Delete post error:', error);
      toast.error("Failed to delete post");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const remainingImages = existingImages.filter(img => !imagesToDelete.includes(img.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-lg shadow-lg p-4" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit Post</h3>
          <button className="cursor-pointer" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          className="w-full border border-gray-300 rounded-md p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[#ff5a58]"
          rows={4}
          placeholder="Share your travel story..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="mb-3">
          <input 
            type="text" 
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a58]" 
            placeholder="Country name (e.g., Japan, United States)" 
            value={countryName} 
            onChange={(e) => setCountryName(e.target.value)} 
          />
        </div>

        {/* Existing Images */}
        {remainingImages.length > 0 && (
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Current Images:</div>
            <div className="grid grid-cols-3 gap-2">
              {remainingImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img 
                    src={supabase.storage.from('post-images').getPublicUrl(img.image_path).data.publicUrl} 
                    alt="Post image" 
                    className="w-full h-24 object-cover rounded-md border border-gray-200"
                  />
                  <button
                    onClick={() => handleRemoveExistingImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <Upload className="w-4 h-4" />
            <span>Add more images</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </label>
          {files.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">{files.length} new image(s) selected</div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            className="px-4 py-2 rounded-md border border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-60 flex items-center gap-2"
            onClick={handleDelete}
            disabled={uploading}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 rounded-md border" 
              onClick={onClose} 
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 rounded-md bg-[#ff5a58] text-white disabled:opacity-60" 
              onClick={handleSubmit} 
              disabled={uploading}
            >
              {uploading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Gallery Component
 * 
 * Photo gallery system for trips with upload, display, and social features.
 * Handles image uploads to Supabase Storage with drag-and-drop functionality.
 * Includes photo commenting, liking, and organization by trip days.
 * Features responsive grid layout with lightbox viewing and social interactions.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Upload, 
  X, 
  MessageCircle, 
  MoreVertical,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  User,
  Loader2,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/avatar";

interface GalleryImage {
  id: string;
  trip_id: string;
  day_number: number;
  image_url: string;
  image_name: string;
  caption?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader_name?: string;
  comments?: ImageComment[];
  likes_count?: number;
  liked_by_user?: boolean;
}

interface ImageComment {
  id: string;
  image_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
  };
}

interface GalleryProps {
  tripId: string;
  userId: string;
  numberOfDays: number;
  participants: Array<{ id: string; name: string; avatar_url?: string }>;
}

export default function Gallery({ tripId, userId, numberOfDays, participants }: GalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch images for the trip
  const fetchImages = async () => {
    try {
      setLoading(true);
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

    const imagesWithUploaderNames = (data || []).map((img: any) => {
      const uploader = participants.find(p => p.id === img.uploaded_by);
      return {
        ...img,
        uploader_name: uploader?.name || 'Unknown',
        comments: [],
        likes_count: 0,
        liked_by_user: false
      } as GalleryImage;
    });

      // Fetch comments and likes for each image in parallel
      const imagesEnriched = await Promise.all(
        imagesWithUploaderNames.map(async (img) => {
          try {
            const [commentsRes, likesRes] = await Promise.all([
              fetch(`/api/gallery/comments?imageId=${encodeURIComponent(img.id)}`),
              fetch(`/api/gallery/likes?imageId=${encodeURIComponent(img.id)}&userId=${encodeURIComponent(userId)}`)
            ]);

            let comments: ImageComment[] | undefined = img.comments;
            if (commentsRes.ok) {
              const json = await commentsRes.json();
              const commentsRaw = (json.comments || []) as ImageComment[];
              comments = commentsRaw.map(c => ({
                ...c,
                user: { name: participants.find(p => p.id === c.user_id)?.name || 'Unknown' }
              }));
            }

            let likes_count = img.likes_count;
            let liked_by_user = img.liked_by_user;
            if (likesRes.ok) {
              const lj = await likesRes.json();
              likes_count = lj.likesCount ?? 0;
              liked_by_user = !!lj.likedByUser;
            }

            return { ...img, comments, likes_count, liked_by_user } as GalleryImage;
          } catch {
            return img;
          }
        })
      );

      setImages(imagesEnriched);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error(`Failed to load gallery images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [tripId]);

  // Handle image upload
  const handleImageUpload = async (files: File[] | File, caption: string) => {
    const fileArray = Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      setUploadProgress(0);
      const total = fileArray.length;
      let completed = 0;

      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tripId', tripId);
        formData.append('dayNumber', selectedDay.toString());
        formData.append('caption', caption);
        formData.append('userId', userId);

        const response = await fetch('/api/gallery/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Upload failed');
        }

        completed += 1;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      toast.success('Images uploaded successfully!');
      setShowUploadModal(false);
      await fetchImages(); // Refresh images
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle comment submission
  const handleAddComment = async (imageId: string) => {
    const content = newComment[imageId]?.trim();
    if (!content) return;

    try {
      const response = await fetch('/api/gallery/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          content,
          userId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add comment');
      }

      // Clear input
      setNewComment(prev => ({ ...prev, [imageId]: '' }));

      // Refresh only this image's comments
      try {
        const res = await fetch(`/api/gallery/comments?imageId=${encodeURIComponent(imageId)}`);
        const json = await res.json();
        if (res.ok) {
          const commentsRaw = (json.comments || []) as ImageComment[];
          const comments = commentsRaw.map(c => ({
            ...c,
            user: { name: participants.find(p => p.id === c.user_id)?.name || 'Unknown' }
          }));
          setImages(prev => prev.map(img => img.id === imageId ? { ...img, comments } : img));
          setSelectedImage(prev => (prev && prev.id === imageId) ? { ...prev, comments } as GalleryImage : prev);
        }
      } catch {}

      toast.success('Comment added!');
    } catch (error) {
      console.error('Comment error:', error);
      const message = error instanceof Error ? error.message : 'Failed to add comment';
      toast.error(message);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId: string, imageId: string) => {
    try {
      const response = await fetch('/api/gallery/comments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete comment');
      }

      // Refresh only this image's comments
      try {
        const res = await fetch(`/api/gallery/comments?imageId=${encodeURIComponent(imageId)}`);
        const json = await res.json();
        if (res.ok) {
          const commentsRaw = (json.comments || []) as ImageComment[];
          const comments = commentsRaw.map(c => ({
            ...c,
            user: { name: participants.find(p => p.id === c.user_id)?.name || 'Unknown' }
          }));
          setImages(prev => prev.map(img => img.id === imageId ? { ...img, comments } : img));
          setSelectedImage(prev => (prev && prev.id === imageId) ? { ...prev, comments } as GalleryImage : prev);
        }
      } catch {}
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Delete comment error:', error);
      toast.error('Failed to delete comment');
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (imageId: string, fileName: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch('/api/gallery/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, fileName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete image');
      }

      // Optimistically update UI
      setImages(prev => prev.filter(img => img.id !== imageId));
      setSelectedImage(prev => (prev && prev.id === imageId) ? null : prev);
      toast.success('Image deleted');
    } catch (error) {
      console.error('Delete image error:', error);
      toast.error('Failed to delete image');
    }
  };

  // Handle caption update
  const handleUpdateCaption = async (imageId: string, caption: string) => {
    try {
      // optimistic update
      setImages(prev => prev.map(img => img.id === imageId ? { ...img, caption } : img));
      setSelectedImage(prev => (prev && prev.id === imageId) ? { ...prev, caption } as GalleryImage : prev);

      const res = await fetch('/api/gallery/upload', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, caption })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update caption');
      }
      toast.success('Caption updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update caption');
      fetchImages();
    } finally {
      // no-op: modal manages its own caption edit state
    }
  };

  // Toggle like on an image
  const handleToggleLike = async (imageId: string) => {
    // optimistic update
    setImages(prev => prev.map(img => {
      if (img.id !== imageId) return img;
      const liked = !img.liked_by_user;
      const count = (img.likes_count || 0) + (liked ? 1 : -1);
      return { ...img, liked_by_user: liked, likes_count: Math.max(0, count) };
    }));
    setSelectedImage(prev => {
      if (!prev || prev.id !== imageId) return prev;
      const liked = !prev.liked_by_user;
      const count = (prev.likes_count || 0) + (liked ? 1 : -1);
      return { ...prev, liked_by_user: liked, likes_count: Math.max(0, count) } as GalleryImage;
    });

    try {
      const res = await fetch('/api/gallery/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, userId })
      });
      const json = await res.json();
      if (res.ok) {
        setImages(prev => prev.map(img => img.id === imageId ? { ...img, liked_by_user: json.likedByUser, likes_count: json.likesCount } : img));
        setSelectedImage(prev => (prev && prev.id === imageId) ? { ...prev, liked_by_user: json.likedByUser, likes_count: json.likesCount } as GalleryImage : prev);
      } else {
        throw new Error(json.error || 'Failed to toggle like');
      }
    } catch (e) {
      // revert on error
      setImages(prev => prev.map(img => {
        if (img.id !== imageId) return img;
        const liked = !img.liked_by_user;
        const count = (img.likes_count || 0) + (liked ? 1 : -1);
        return { ...img, liked_by_user: liked, likes_count: Math.max(0, count) };
      }));
      setSelectedImage(prev => {
        if (!prev || prev.id !== imageId) return prev;
        const liked = !prev.liked_by_user;
        const count = (prev.likes_count || 0) + (liked ? 1 : -1);
        return { ...prev, liked_by_user: liked, likes_count: Math.max(0, count) } as GalleryImage;
      });
      toast.error(e instanceof Error ? e.message : 'Failed to toggle like');
    }
  };

  // Get images for selected day
  const dayImages = images.filter(img => img.day_number === selectedDay);

  // Get unique days with images
  const daysWithImages = Array.from(new Set(images.map(img => img.day_number))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark">Trip Gallery</h2>
          <p className="hidden md:block text-gray-600 mt-1">Share and organize your trip memories by day</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Upload Photo
        </Button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedDay === day
                ? 'bg-[#ff5a58] text-white'
                : daysWithImages.includes(day)
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400'
            }`}
          >
            Day {day}
            {daysWithImages.includes(day) && (
              <span className={`w-6 h-6 text-white text-xs rounded-full flex items-center justify-center ${
                selectedDay === day ? 'bg-[#303030]' : 'bg-[#ff5a58]'
              }`}>
                {images.filter(img => img.day_number === day).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Gallery...</h3>
          <p className="text-gray-500">Fetching your trip photos</p>
        </div>
      ) : dayImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {dayImages.map((image) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={image.image_url}
                  alt={image.caption || image.image_name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-5 h-5 text-white" />
                    <span className="text-white text-sm font-medium">
                      {image.comments?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-5 h-5 text-white" />
                    <span className="text-white text-sm font-medium">
                      {image.likes_count ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Caption */}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 rounded-b-lg">
                  <p className="text-white text-sm font-medium truncate">{image.caption}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Photos Yet</h3>
          <p className="text-gray-500 mb-6">Upload photos for Day {selectedDay} to get started!</p>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUpload={handleImageUpload}
            uploading={uploading}
            uploadProgress={uploadProgress}
            selectedDay={selectedDay}
            fileInputRef={fileInputRef}
          />
        )}
      </AnimatePresence>

      {/* Image Detail Modal */}
      <AnimatePresence>
        {selectedImage && (
          <ImageDetailModal
            image={images.find(img => img.id === selectedImage.id) || selectedImage}
            onClose={() => setSelectedImage(null)}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onDeleteImage={handleDeleteImage}
            onToggleLike={handleToggleLike}
            onUpdateCaption={handleUpdateCaption}
            newComment={newComment}
            setNewComment={setNewComment}
            showComments={showComments}
            setShowComments={setShowComments}
            userId={userId}
            participants={participants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Upload Modal Component
function UploadModal({ 
  onClose, 
  onUpload, 
  uploading, 
  uploadProgress,
  selectedDay, 
  fileInputRef 
}: {
  onClose: () => void;
  onUpload: (files: File[] | File, caption: string) => void;
  uploading: boolean;
  uploadProgress: number;
  selectedDay: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length > 0) onUpload(selectedFiles, caption);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark">Upload Photo</h3>
          <button onClick={onClose} className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day {selectedDay}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption (optional, applied to all)
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption for this photo..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 bg-[#ff5a58] hover:bg-[#ff4a47] text-white"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length > 1 ? `${selectedFiles.length} files` : 'Photo'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Image Detail Modal Component
function ImageDetailModal({ 
  image, 
  onClose, 
  onAddComment, 
  onDeleteComment, 
  onDeleteImage,
  onToggleLike,
  onUpdateCaption,
  newComment,
  setNewComment,
  showComments,
  setShowComments,
  userId,
  participants
}: {
  image: GalleryImage;
  onClose: () => void;
  onAddComment: (imageId: string) => void;
  onDeleteComment: (commentId: string, imageId: string) => void;
  onDeleteImage: (imageId: string, fileName: string) => void;
  onToggleLike: (imageId: string) => void;
  onUpdateCaption: (imageId: string, caption: string) => void;
  newComment: Record<string, string>;
  setNewComment: (value: Record<string, string>) => void;
  showComments: Set<string>;
  setShowComments: (value: Set<string>) => void;
  userId: string;
  participants: Array<{ id: string; name: string; avatar_url?: string }>;
}) {
  const isOwner = image.uploaded_by === userId;
  const fileName = image.image_url.split('/').pop() || '';
  const [isEditing, setIsEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(image.caption || '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-dark">Day {image.day_number}</h3>
            <p className="text-sm text-gray-500">
              by {image.uploader_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newSet = new Set(showComments);
                if (showComments.has(image.id)) {
                  newSet.delete(image.id);
                } else {
                  newSet.add(image.id);
                }
                setShowComments(newSet);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-gray-500" />
            </button>
            {isOwner && (
              <button
                onClick={() => onDeleteImage(image.id, fileName)}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            )}
            <button onClick={onClose} className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Image */}
          <div className="flex-1 p-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={image.image_url}
                alt={image.caption || image.image_name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => onToggleLike(image.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${image.liked_by_user ? 'bg-[#ff5a58] text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                <img 
                  src={image.liked_by_user ? '/assets/bone.svg' : '/assets/bone-plain.svg'} 
                  alt="Like" 
                  className="w-4 h-4"
                  style={image.liked_by_user ? {
                    filter: 'brightness(0) invert(1)'
                  } : {
                    filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
                  }}
                />
                <span className={`text-sm font-medium ${image.liked_by_user ? 'text-white' : ''}`}>
                  {image.likes_count ?? 0}
                </span>
              </button>
            </div>
            <div className="mt-3">
              {isOwner ? (
                isEditing ? (
                  <div className="flex gap-2 items-start">
                    <Textarea
                      className="flex-1 text-sm resize-none"
                      rows={3}
                      value={draftCaption}
                      onChange={(e) => setDraftCaption(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => { onUpdateCaption(image.id, draftCaption); setIsEditing(false); }}
                        className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setIsEditing(false); setDraftCaption(image.caption || ''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-gray-700 flex-1 whitespace-pre-wrap">{image.caption || 'Add a caption...'}</p>
                    <Button
                      variant="outline"
                      onClick={() => { setIsEditing(true); setDraftCaption(image.caption || ''); }}
                    >
                      Edit
                    </Button>
                  </div>
                )
              ) : (
                image.caption ? <p className="text-gray-700">{image.caption}</p> : null
              )}
            </div>
          </div>

          {/* Comments Sidebar */}
          {showComments.has(image.id) && (
            <div className="w-full lg:w-80 border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-semibold text-dark">Comments ({image.comments?.length || 0})</h4>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {image.comments?.map((comment) => {
                  const commenter = participants.find(p => p.id === comment.user_id);
                  return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-dark">
                          {comment.user?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                    {comment.user_id === userId && (
                      <button
                        onClick={() => onDeleteComment(comment.id, image.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* Add Comment */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment[image.id] || ''}
                    onChange={(e) => setNewComment({ ...newComment, [image.id]: e.target.value })}
                    placeholder="Add a comment..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        onAddComment(image.id);
                      }
                    }}
                  />
                  <Button
                    onClick={() => onAddComment(image.id)}
                    disabled={!newComment[image.id]?.trim()}
                    className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-3 py-2"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

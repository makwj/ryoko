"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Upload, 
  X, 
  MessageCircle, 
  Heart,
  MoreVertical,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

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
  participants: Array<{ id: string; name: string }>;
}

export default function Gallery({ tripId, userId, numberOfDays, participants }: GalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch images for the trip
  const fetchImages = async () => {
    try {
      console.log('Fetching images for trip:', tripId);
      const { data, error } = await supabase
        .from('gallery_images')
        .select(`
          *,
          uploader:profiles(name),
          comments:image_comments(
            *,
            user:profiles(name)
          )
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched images:', data);
      const imagesWithUploaderNames = data.map(img => ({
        ...img,
        uploader_name: img.uploader?.name || 'Unknown',
        comments: img.comments || []
      }));

      setImages(imagesWithUploaderNames);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error(`Failed to load gallery images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [tripId]);

  // Handle image upload
  const handleImageUpload = async (file: File, caption: string) => {
    if (!file) return;

    setUploading(true);
    try {
      console.log('Uploading image:', { file: file.name, size: file.size, type: file.type });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tripId', tripId);
      formData.append('dayNumber', selectedDay.toString());
      formData.append('caption', caption);
      formData.append('userId', userId);

      console.log('Sending upload request...');
      const response = await fetch('/api/gallery/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success('Image uploaded successfully!');
      setShowUploadModal(false);
      fetchImages(); // Refresh images
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
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

      setNewComment(prev => ({ ...prev, [imageId]: '' }));
      fetchImages(); // Refresh to get new comment
      toast.success('Comment added!');
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId: string) => {
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

      fetchImages(); // Refresh to remove comment
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

      fetchImages(); // Refresh images
      toast.success('Image deleted');
    } catch (error) {
      console.error('Delete image error:', error);
      toast.error('Failed to delete image');
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
          <p className="text-gray-600 mt-1">Share and organize your trip memories by day</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedDay === day
                ? 'bg-red-500 text-white'
                : daysWithImages.includes(day)
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Day {day}
            {daysWithImages.includes(day) && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {images.filter(img => img.day_number === day).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Images Grid */}
      {dayImages.length > 0 ? (
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
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-white" />
                  <span className="text-white text-sm font-medium">
                    {image.comments?.length || 0}
                  </span>
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
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Camera className="w-5 h-5 mr-2" />
            Upload First Photo
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUpload={handleImageUpload}
            uploading={uploading}
            selectedDay={selectedDay}
            fileInputRef={fileInputRef}
          />
        )}
      </AnimatePresence>

      {/* Image Detail Modal */}
      <AnimatePresence>
        {selectedImage && (
          <ImageDetailModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onDeleteImage={handleDeleteImage}
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
  selectedDay, 
  fileInputRef 
}: {
  onClose: () => void;
  onUpload: (file: File, caption: string) => void;
  uploading: boolean;
  selectedDay: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile, caption);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark">Upload Photo</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption for this photo..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
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
              disabled={!selectedFile || uploading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
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
  onDeleteComment: (commentId: string) => void;
  onDeleteImage: (imageId: string, fileName: string) => void;
  newComment: Record<string, string>;
  setNewComment: (value: Record<string, string>) => void;
  showComments: Set<string>;
  setShowComments: (value: Set<string>) => void;
  userId: string;
  participants: Array<{ id: string; name: string }>;
}) {
  const isOwner = image.uploaded_by === userId;
  const fileName = image.image_url.split('/').pop() || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
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
            <p className="text-sm text-gray-500">by {image.uploader_name}</p>
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
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
            {image.caption && (
              <p className="mt-3 text-gray-700">{image.caption}</p>
            )}
          </div>

          {/* Comments Sidebar */}
          {showComments.has(image.id) && (
            <div className="w-full lg:w-80 border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-semibold text-dark">Comments ({image.comments?.length || 0})</h4>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {image.comments?.map((comment) => (
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
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
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
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2"
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

/**
 * ProfileDropdown Component
 * 
 * User profile dropdown menu in the navigation bar.
 * Displays user avatar, name, and provides access to profile settings.
 * Includes profile editing modal with avatar upload and name updates.
 * Handles user logout and profile management functionality.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, LogOut, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileDropdownProps {
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
  onProfileUpdated?: () => void;
}

export default function ProfileDropdown({ user, onProfileUpdated }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logged out successfully!");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
    setIsOpen(false);
  };

  const handleProfileUpdatedCallback = () => {
    setShowEditProfile(false);
    // Call the parent's profile updated callback
    if (onProfileUpdated) {
      onProfileUpdated();
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Avatar 
            name={user.name || user.email} 
            imageUrl={user.avatar_url}
            size="sm"
          />
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar 
                  name={user.name || user.email} 
                  imageUrl={user.avatar_url}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={handleEditProfile}
                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Edit Profile
              </button>
              
              <button
                onClick={handleLogout}
                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={showEditProfile}
        user={user}
        onClose={() => setShowEditProfile(false)}
        onProfileUpdated={handleProfileUpdatedCallback}
      />
    </>
  );
}

// Edit Profile Modal Component
interface EditProfileModalProps {
  open: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
  onClose: () => void;
  onProfileUpdated: () => void;
}

function EditProfileModal({ open, user, onClose, onProfileUpdated }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setAvatarFile(file);
      setRemoveAvatar(false); // Reset remove flag when new file is selected
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = user.avatar_url;

      // Handle avatar removal
      if (removeAvatar) {
        avatarUrl = null;
      }
      // Upload new avatar if selected
      else if (avatarFile) {
        setUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = data.publicUrl;
        setUploading(false);
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: formData.name.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      toast.success('Profile updated successfully!');
      onProfileUpdated();
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#EEEEEE] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and avatar picture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar 
                name={formData.name || user.email} 
                imageUrl={avatarPreview || undefined}
                size="xl"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="cursor-pointer absolute -bottom-2 -right-2 bg-[#0B486B] text-white rounded-full p-2 hover:bg-[#072B3F] transition-colors"
                    disabled={uploading}
                    title="Edit picture"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-44 p-1">
                  <div className="flex flex-col">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                      disabled={uploading}
                    >
                      Change picture
                    </button>
                    {(user.avatar_url || avatarPreview) && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="cursor-pointer text-left px-3 py-2 text-sm text-red-600 rounded hover:bg-red-50"
                        disabled={uploading}
                      >
                        Remove picture
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Name Field */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 cursor-pointer"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || !formData.name.trim()}
            className="flex-1 bg-[#FF5757] hover:bg-[#FF4747] text-white cursor-pointer"
          >
            {loading || uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {uploading ? 'Uploading...' : 'Saving...'}
              </div>
            ) : (
              'Done'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

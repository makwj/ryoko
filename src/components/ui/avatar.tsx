"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { CustomTooltip } from "./tooltip";

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
}

// Generate a consistent color based on the name
const generateColorFromName = (name: string): string => {
  const colors = [
    "bg-red-500",
    "bg-[#0B486B]", 
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-sky-500"
  ];
  
  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & 0xffffffff; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const getSizeClasses = (size: "sm" | "md" | "lg" | "xl") => {
  switch (size) {
    case "sm":
      return "w-6 h-6 text-xs";
    case "md":
      return "w-8 h-8 text-sm";
    case "lg":
      return "w-10 h-10 text-base";
    case "xl":
      return "w-12 h-12 text-lg";
    default:
      return "w-8 h-8 text-sm";
  }
};

export default function Avatar({ 
  name, 
  imageUrl, 
  size = "md", 
  className = "", 
  onClick,
  showTooltip = true,
  tooltipPosition = "top"
}: AvatarProps) {
  // Initialize imageError based on whether we have a valid imageUrl
  const [imageError, setImageError] = useState(() => {
    return !(imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '');
  });
  
  const sizeClasses = getSizeClasses(size);
  const colorClass = generateColorFromName(name);
  const initials = name.charAt(0).toUpperCase();
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Reset image error state when imageUrl changes
  useEffect(() => {
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      setImageError(false);
    } else {
      // If imageUrl is empty/null/undefined, ensure we show fallback
      setImageError(true);
    }
  }, [imageUrl]);

  // Check if we should show image or fallback
  const shouldShowImage = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' && !imageError;

  const avatarContent = (
    <div
      className={`
        ${sizeClasses} 
        rounded-full 
        flex items-center justify-center 
        font-medium text-white 
        cursor-pointer 
        transition-all duration-200 
        hover:scale-105 
        overflow-hidden
        ${!shouldShowImage ? colorClass : ''}
        ${onClick ? 'hover:ring-2 hover:ring-blue-200' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {shouldShowImage ? (
        <img
          src={imageUrl}
          alt={name}
          className={`${sizeClasses} rounded-full object-cover`}
          onError={handleImageError}
        />
      ) : (
        <div className={`w-full h-full ${colorClass} rounded-full flex items-center justify-center`}>
          {initials}
        </div>
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <CustomTooltip content={name} position={tooltipPosition}>
        {avatarContent}
      </CustomTooltip>
    );
  }

  return avatarContent;
}

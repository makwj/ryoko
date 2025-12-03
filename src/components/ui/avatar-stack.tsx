"use client";

import Avatar from "./avatar";

interface AvatarStackProps {
  participants: Array<{
    id: string;
    name: string;
    avatar_url?: string;
  }>;
  maxVisible?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function AvatarStack({ 
  participants, 
  maxVisible = 3, 
  size = "sm",
  className = "" 
}: AvatarStackProps) {
  if (!participants || participants.length === 0) {
    return null;
  }

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className="relative"
            style={{ zIndex: visibleParticipants.length - index }}
          >
            <Avatar
              name={participant.name || participant.id || 'User'}
              imageUrl={
                participant.avatar_url && 
                typeof participant.avatar_url === 'string' && 
                participant.avatar_url.trim() !== '' 
                  ? participant.avatar_url 
                  : undefined
              }
              size={size}
              className="border-2 border-white"
            />
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className="relative"
            style={{ zIndex: 0 }}
          >
            <div className={`
              ${size === 'sm' ? 'w-6 h-6' : 
                size === 'md' ? 'w-8 h-8' : 
                size === 'lg' ? 'w-10 h-10' : 'w-12 h-12'} 
              bg-gray-200 border-2 border-white rounded-full flex items-center justify-center
            `}>
              <span className={`
                ${size === 'sm' ? 'text-xs' : 
                  size === 'md' ? 'text-sm' : 
                  size === 'lg' ? 'text-base' : 'text-lg'} 
                font-medium text-gray-600
              `}>
                +{remainingCount}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

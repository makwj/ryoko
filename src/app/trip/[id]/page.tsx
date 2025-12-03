"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import { RealtimeCursors } from "@/components/RealtimeCursors";
import { 
  MapPin, 
  Users, 
  Bookmark, 
  Calendar, 
  Clock, 
  Train, 
  MoreVertical,
  Plus,
  ArrowLeft,
  Pin,
  Paperclip,
  Edit,
  Trash2,
  DollarSign,
  MessageCircle,
  ExternalLink,
  Archive,
  Play,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
  GripVertical,
  Check,
  Square,
  X,
  Camera,
  Upload,
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  Zap,
  Snowflake,
  CloudFog,
  HelpCircle,
  Navigation,
  Star,
  Activity,
  Calculator,
  Phone
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import AddActivityModal from "@/components/AddActivityModal";
import UpdateInterestsModal from "@/components/UpdateInterestsModal";
import EditActivityModal from "@/components/EditActivityModal";
import AddExpenseModal from "@/components/AddExpenseModal";
import EditExpenseModal from "@/components/EditExpenseModal";
import AddIdeaModal from "@/components/AddIdeaModal";
import EditIdeaModal from "@/components/EditIdeaModal";
import MoveToItineraryModal from "@/components/MoveToItineraryModal";
import EditTripModal from "@/components/EditTripModal";
import InviteCollaboratorsModal from "@/components/InviteCollaboratorsModal";
import ShareTripGuideModal from "@/components/ShareTripGuideModal";
import Gallery from "@/components/Gallery";
import TripImageHeader from "@/components/TripImageHeader";
import LinkPreview from "@/components/LinkPreview";
import TextSelectionAI from "@/components/TextSelectionAI";
import LocationTooltip from "@/components/LocationTooltip";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { extractFirstUrl, removeUrlsFromText } from "@/lib/linkUtils";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ActivityLogger, fetchActivityLogs, clearActivityHistory, ActivityLog } from "@/lib/activityLogger";
import Avatar from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Navbar from "@/components/Navbar";
import UserProfileDialog from "@/components/UserProfileDialog";
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Trip {
  id: string;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  interests: string[];
  collaborators: string[] | null;
  owner_id: string;
  archived?: boolean;
  completed?: boolean;
  trip_image_url?: string;
  shared_to_social?: boolean;
  share_caption?: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  description: string;
  time_period: 'morning' | 'afternoon' | 'evening';
  location: string;
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food' | 'shopping' | 'entertainment' | 'other';
  note?: string;
  link_url?: string;
  attachments?: (string | {url: string, customName: string})[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface Expense {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  amount: number;
  category: 'food' | 'transportation' | 'accommodation' | 'activity' | 'shopping' | 'other';
  paid_by: string;
  added_by: string;
  split_with: string[] | 'everyone';
  split_amounts?: Record<string, number>;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  userPaid: number;
  userShare: number;
}

interface Idea {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  location?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
  tags: string[];
  added_by: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
}

interface IdeaVote {
  id: string;
  idea_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Settlement {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  is_paid: boolean;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

interface TripRecommendation {
  id: string;
  title: string;
  description: string;
  location: string;
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food' | 'shopping' | 'nature' | 'history' | 'culture' | 'entertainment' | 'sports' | 'religion';
  relevant_link: string;
  estimated_time: string;
  image_url?: string;
  generated_at: string;
  // Enhanced fields from Google Places API
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: string[];
  website?: string;
  phone_number?: string;
  place_id?: string;
  price_level?: number;
  // New comprehensive fields
  category?: 'Must-Visit' | 'Recommended' | 'Consider';
  best_for?: string;
  timing_advice?: string;
  group_suitability?: string;
  practical_tips?: string;
}

// Helper function to get weather icon component
const getWeatherIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    'sun': <Sun className="w-4 h-4" />,
    'moon': <Moon className="w-4 h-4" />,
    'cloud-sun': <CloudSun className="w-4 h-4" />,
    'cloud-moon': <CloudMoon className="w-4 h-4" />,
    'cloud': <Cloud className="w-4 h-4" />,
    'cloud-rain': <CloudRain className="w-4 h-4" />,
    'cloud-drizzle': <CloudDrizzle className="w-4 h-4" />,
    'zap': <Zap className="w-4 h-4" />,
    'snowflake': <Snowflake className="w-4 h-4" />,
    'cloud-fog': <CloudFog className="w-4 h-4" />
  };
  
  return iconMap[iconName] || <Cloud className="w-4 h-4" />;
};

// Droppable Day Component
function DroppableDay({ 
  day, 
  isActive,
  onDayClick,
  formatDate,
  weather,
  getWeatherIconComponent,
  onlineUsers,
  currentUserId,
  participants,
  onUserClick
}: {
  day: { day: number; date: Date; activities: number };
  isActive: boolean;
  onDayClick: (dayNumber: number) => void;
  formatDate: (date: string) => string;
  weather?: any;
  getWeatherIconComponent: (iconName: string) => React.ReactElement;
  onlineUsers?: { id: string; name: string; currentTab: string; currentDay?: number }[];
  currentUserId?: string;
  participants?: { id: string; name: string; avatar_url?: string }[];
  onUserClick?: (userId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${day.day}`,
  });

  // Get users currently viewing this specific day
  const usersOnThisDay = onlineUsers?.filter(u => 
    u.id !== currentUserId && 
    u.currentTab === 'itinerary' && 
    u.currentDay === day.day
  ) || [];

  return (
    <button
      ref={setNodeRef}
      onClick={() => onDayClick(day.day)}
      className={`cursor-pointer w-full text-left p-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-[#ff5a58] text-white'
          : isOver
          ? 'bg-blue-100 border-2 border-blue-400 border-dashed'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium">Day {day.day}</div>
          <div className="text-sm opacity-75">
            {formatDate(day.date.toISOString())}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {weather ? (
              <>
                {getWeatherIconComponent(weather.icon)}
                <div className="text-xs">
                  <div className="font-medium">
                    {weather.temperature.high}°/{weather.temperature.low}°F
                  </div>
                  <div>{weather.condition}</div>
                </div>
              </>
            ) : (
              <>
                <HelpCircle className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <div className="text-xs">
                  <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>Not Available</div>
                  <div className={`${isActive ? 'text-white opacity-80' : 'text-gray-400'}`}>Weather data unavailable</div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Avatar indicators for users on this day */}
          {usersOnThisDay.length > 0 && (
            <div className="flex -space-x-1">
              {usersOnThisDay.slice(0, 3).map((user, index) => {
                const participant = participants?.find(p => p.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`${isActive ? 'border-white' : 'border-gray-100'}`}
                  >
                    <Avatar
                      name={user.name}
                      imageUrl={participant?.avatar_url}
                      size="sm"
                      className="border-2"
                      onClick={() => onUserClick && onUserClick(user.id)}
                    />
                  </div>
                );
              })}
              {usersOnThisDay.length > 3 && (
                <div className={`w-5 h-5 rounded-full border-2 ${
                  isActive ? 'border-white' : 'border-gray-100'
                } bg-gray-400 flex items-center justify-center text-xs font-medium text-white`}>
                  +{usersOnThisDay.length - 3}
                </div>
              )}
            </div>
          )}
          {/* Activity count */}
          <div className={`w-6 h-6 text-white text-xs rounded-full flex items-center justify-center ${
            isActive ? 'bg-[#303030] text-[#303030]' : 'bg-red-500'
          }`}>
            {day.activities}
          </div>
        </div>
      </div>
      {isOver && (
        <div className="mt-2 text-xs text-blue-600 font-medium">
          Drop activity here
        </div>
      )}
    </button>
  );
}

// Drop Indicator Component
function DropIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  
  return (
    <div className="h-0.5 bg-blue-400 rounded-full mx-4 my-2 animate-pulse" />
  );
}


// Insert Drop Zone Component
function InsertDropZone({ 
  id, 
  isVisible, 
  dragOverId 
}: { 
  id: string; 
  isVisible: boolean; 
  dragOverId: string | null;
}) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[5px] transition-colors ${
        dragOverId === id 
          ? 'bg-blue-100 border-2 border-blue-400 border-dashed rounded' 
          : ''
      }`}
    >
      <DropIndicator isVisible={isVisible} />
    </div>
  );
}

// Time Period Section Component
function TimePeriodSection({ 
  period, 
  periodActivities, 
  activeDay, 
  dragOverId, 
  activeId, 
  selectedActivities, 
  toggleActivitySelection, 
  handleEditActivity, 
  handleDeleteActivity, 
  getTypeColor, 
  isMultiSelectMode,
  onAskAI
}: {
  period: { key: string; label: string; icon: string };
  periodActivities: Activity[];
  activeDay: number;
  dragOverId: string | null;
  activeId: string | null;
  selectedActivities: Set<string>;
  toggleActivitySelection: (activityId: string) => void;
  handleEditActivity: (activity: Activity) => void;
  handleDeleteActivity: (activityId: string) => void;
  getTypeColor: (type: string) => string;
  isMultiSelectMode: boolean;
  onAskAI: (title: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: `time-${activeDay}-${period.key}`,
  });

  return (
    <div className="mb-6">
      {/* Time Period Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <span className="text-lg">{period.icon}</span>
        <h3 className="text-lg font-semibold text-gray-800">{period.label}</h3>
        {periodActivities.length > 0 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {periodActivities.length} {periodActivities.length === 1 ? 'activity' : 'activities'}
          </span>
        )}
      </div>
      
      {/* Activities for this time period - Droppable Area */}
      <div 
        ref={setNodeRef}
        className={`space-y-3 min-h-[60px] p-3 rounded-lg transition-colors ${
          dragOverId === `time-${activeDay}-${period.key}` 
            ? 'bg-blue-50 border-2 border-blue-300 border-dashed' 
            : 'border-2 border-transparent'
        }`}
      >
        {periodActivities.length === 0 && dragOverId === `time-${activeDay}-${period.key}` && (
          <div className="text-center py-4 text-blue-600 font-medium">
            Drop activity here to add to {period.label}
          </div>
        )}
        
        {periodActivities.map((activity, index) => (
          <div key={activity.id}>
            {/* Drop zone before each activity */}
            <InsertDropZone
              id={`insert-${activeDay}-${period.key}-${index}`}
              isVisible={dragOverId === `insert-${activeDay}-${period.key}-${index}`}
              dragOverId={dragOverId}
            />
            
            <SortableActivityItem
              activity={activity}
              isSelected={selectedActivities.has(activity.id)}
              onToggleSelect={toggleActivitySelection}
              onEdit={handleEditActivity}
              onDelete={handleDeleteActivity}
              getTypeColor={getTypeColor}
              isMultiSelectMode={isMultiSelectMode}
              onAskAI={onAskAI}
            />
          </div>
        ))}
        
        {/* Drop zone after the last activity */}
        <InsertDropZone
          id={`insert-${activeDay}-${period.key}-${periodActivities.length}`}
          isVisible={dragOverId === `insert-${activeDay}-${period.key}-${periodActivities.length}`}
          dragOverId={dragOverId}
        />
      </div>
    </div>
  );
}

// Sortable Activity Component
function SortableActivityItem({ 
  activity, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete, 
  getTypeColor, 
  isMultiSelectMode,
  onAskAI
}: {
  activity: Activity;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  getTypeColor: (type: string) => string;
  isMultiSelectMode: boolean;
  onAskAI: (title: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg px-8 py-4 shadow-sm hover:shadow-md transition-all duration-200 ${
        isMultiSelectMode && isSelected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-2 rounded hover:bg-gray-100 transition-colors touch-none"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="w-4 h-4 cursor-pointer" />
          </div>
          
          {/* Selection Checkbox - Only show in multi-select mode */}
          {isMultiSelectMode && (
            <button
              onClick={() => onToggleSelect(activity.id)}
              className="cursor-pointer p-1 rounded hover:bg-gray-100 transition-colors"
            >
              {isSelected ? (
                <Check className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(activity.activity_type)} whitespace-nowrap`}>
            {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          
          <Popover>
            <PopoverTrigger asChild>
              <button 
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="More options"
              >
                <MoreVertical className="w-4 h-4 cursor-pointer" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <button
                  onClick={() => onEdit(activity)}
                  className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Activity
                </button>
                <button
                  onClick={() => onDelete(activity.id)}
                  className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Activity
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <LocationTooltip 
            locationText={activity.title} 
            onAskAI={() => onAskAI(activity.title)}
          >
            <h3 className="font-semibold text-xl text-dark truncate hover:text-blue-600 transition-colors cursor-pointer underline decoration-dotted decoration-transparent hover:decoration-blue-600">{activity.title}</h3>
          </LocationTooltip>
      {activity.description && (
        <p className="text-gray-600 text-sm mb-3">{activity.description}</p>
      )}

      <div className="flex items-center gap-4 mb-3">
       
        {activity.location && (
          <div className="flex items-center gap-2 text-sm text-gray-500" data-location={activity.location}>
            <MapPin className="w-4 h-4" />
            {activity.location}
          </div>
        )}
      </div>

      {activity.note && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {activity.note}
          </p>
        </div>
      )}

      {activity.link_url && (
        <div className="mb-3">
          <LinkPreview url={activity.link_url} />
        </div>
      )}

      {activity.attachments && activity.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">Attachments:</p>
          {activity.attachments.map((attachment, index) => {
            // Handle different attachment formats
            let url: string;
            let fileName: string;
            
            // Check if attachment is a stringified JSON object
            if (typeof attachment === 'string' && attachment.startsWith('{')) {
              try {
                const parsedAttachment = JSON.parse(attachment);
                url = parsedAttachment.url;
                fileName = (parsedAttachment.customName && parsedAttachment.customName.trim()) 
                  ? parsedAttachment.customName 
                  : parsedAttachment.url.split('/').pop() || `attachment-${index + 1}`;
              } catch {
                // If parsing fails, treat as regular URL
                url = attachment;
                fileName = attachment.split('/').pop() || `attachment-${index + 1}`;
              }
            } else if (typeof attachment === 'string') {
              // Regular URL string
              url = attachment;
              fileName = attachment.split('/').pop() || `attachment-${index + 1}`;
            } else {
              // Object format
              url = attachment.url;
              fileName = (attachment.customName && attachment.customName.trim()) 
                ? attachment.customName 
                : attachment.url.split('/').pop() || `attachment-${index + 1}`;
            }
            
            // Ensure url is a string
            if (typeof url !== 'string') {
              console.error('Invalid URL type:', typeof url, url);
              return null;
            }
            
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                <span>{fileName}</span>
              </a>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  
  // Global error handler to catch unhandled promise rejections that could break event handlers
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the error from breaking the app
      event.preventDefault();
    };
    
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      // Don't prevent default - let React handle it, but log it
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    userPaid: 0,
    userShare: 0
  });
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaVotes, setIdeaVotes] = useState<IdeaVote[]>([]);
  const [ideaComments, setIdeaComments] = useState<IdeaComment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Helper function to show confirmation dialog
  const showConfirmation = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'warning' = 'danger', confirmText?: string, cancelText?: string) => {
    setConfirmationConfig({
      title,
      description,
      onConfirm: async () => {
        setConfirmationConfig(prev => prev ? { ...prev, isLoading: true } : null);
        
        // Create a safety timeout to ensure loading state is always reset
        const safetyTimeout = setTimeout(() => {
          console.warn('Confirmation action exceeded safety timeout, resetting loading state');
          setConfirmationConfig(prev => prev ? { ...prev, isLoading: false } : null);
          setShowConfirmationDialog(false);
          setConfirmationConfig(null);
        }, 30000); // 30 second safety timeout

        try {
          await onConfirm();
          clearTimeout(safetyTimeout);
          setShowConfirmationDialog(false);
          setConfirmationConfig(null);
        } catch (error) {
          clearTimeout(safetyTimeout);
          console.error('Confirmation action failed:', error);
          setConfirmationConfig(prev => prev ? { ...prev, isLoading: false } : null);
          // Close dialog after a short delay to allow user to see error, but ensure it closes
          setTimeout(() => {
            setShowConfirmationDialog(false);
            setConfirmationConfig(null);
          }, 2000);
        }
      },
      variant,
      confirmText,
      cancelText
    });
    setShowConfirmationDialog(true);
  };

  // Handle AI chat for destination (function declaration to allow hoisting before JSX usage)
  function handleDestinationAskAI(destinationText: string) {
    setSelectedDestination(destinationText);
    setShowAIChatSidebar(true);
    setAiMessages([]);
    setNearbyAttractions([]);
  }

  // Send AI message
  const sendAIMessage = async (message: string) => {
    if (!selectedDestination) return;
    
    // Check if this is the nearby attractions question
    if (message === "What are the nearby attractions?") {
      await fetchNearbyAttractions();
      return;
    }
    if (message === "What are the nearby accommodations?") {
      await fetchNearbyAccommodations();
      return;
    }
    
    setAiLoading(true);
    const userMessage = { role: 'user' as const, content: message };
    setAiMessages(prev => [...prev, userMessage]);

    try {
      // Use real API
      const response = await fetch('/api/chat-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripData: trip ? {
            destination: trip.destination,
            interests: trip.interests || [],
            numberOfDays: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
            numberOfParticipants: participants.length,
            startDate: trip.start_date
          } : undefined,
          question: message,
          selectedPlace: {
            name: selectedDestination,
            location: trip?.destination || '',
            description: `Information about ${selectedDestination}`
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const responseText: string = data.response || '';

      // Heuristic: if the AI response starts by bolding a specific place, e.g.
      // "**Lookout Point @ Changkat Tunku** in Kuala Lumpur, Malaysia ...",
      // parse that as a recommended attraction and surface it as a card
      // that can be added to Ideas.
      try {
        const boldPlaceMatch = responseText.match(/\*\*(.+?)\*\*\s+in\s+([^.!\n]+)[.!?\n]/);
        if (boldPlaceMatch && trip) {
          const placeName = boldPlaceMatch[1].trim();
          const placeLocation = boldPlaceMatch[2].trim();

          const attraction = {
            name: placeName,
            category: 'attraction',
            description: responseText,
            location: placeLocation || trip.destination,
            rating: undefined as number | undefined,
            distance: undefined as string | undefined,
            image: undefined as string | undefined,
            linkUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${placeName} ${placeLocation || trip.destination || ''}`.trim()
            )}`,
          };

          setNearbyAttractions(prev => [...prev, attraction]);
        }
      } catch (parseError) {
        console.warn('Failed to parse highlighted place from AI response:', parseError);
      }

      const aiMessage = { role: 'assistant' as const, content: responseText };
      setAiMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending AI message:', error);
      const errorMessage = { role: 'assistant' as const, content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch nearby attractions
  const fetchNearbyAttractions = async () => {
    if (!selectedDestination || !trip) return;
    
    // Clear existing results while refreshing
    setNearbyAttractions([]);
    setAttractionsLoading(true);
    const userMessage = { role: 'user' as const, content: "What are the nearby attractions?" };
    setAiMessages(prev => [...prev, userMessage]);

    try {
      // Use real API
      const response = await fetch('/api/nearby-attractions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: trip.destination,
          placeName: selectedDestination,
          refreshToken: `${Date.now()}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to get nearby attractions'}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.success && data.attractions) {
        setNearbyAttractions(data.attractions);
        const aiMessage = { 
          role: 'assistant' as const, 
          content: `Found ${data.attractions.length} nearby attractions! Check them out below and add any that interest you to your idea board.` 
        };
        setAiMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('No attractions found');
      }
    } catch (error) {
      console.error('Error fetching nearby attractions:', error);
      const errorMessage = { role: 'assistant' as const, content: `Sorry, I couldn't find nearby attractions: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAttractionsLoading(false);
    }
  };

  // Fetch nearby accommodations
  const fetchNearbyAccommodations = async () => {
    if (!selectedDestination || !trip) return;
    // Clear existing results while refreshing
    setNearbyAccommodations([]);
    setAccommodationsLoading(true);
    const userMessage = { role: 'user' as const, content: "What are the nearby accommodations?" };
    setAiMessages(prev => [...prev, userMessage]);

    try {
      // Use real API
      const response = await fetch('/api/nearby-accommodations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination,
          placeName: selectedDestination,
          refreshToken: `${Date.now()}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to get nearby accommodations'}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.success && data.accommodations) {
        setNearbyAccommodations(data.accommodations);
        const aiMessage = { role: 'assistant' as const, content: `Found ${data.accommodations.length} nearby accommodations.` };
        setAiMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('No accommodations found');
      }
    } catch (error) {
      console.error('Error fetching nearby accommodations:', error);
      const errorMessage = { role: 'assistant' as const, content: `Sorry, I couldn't find nearby accommodations: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAccommodationsLoading(false);
    }
  };

  // Add attraction to idea board
  const addAttractionToIdeas = async (attraction: {
    name: string;
    category: string;
    description: string;
    location?: string;
    rating?: number;
    distance?: string;
    image?: string;
    linkUrl?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Map category to tag (normalized for accommodations and other types)
      const normalized = (attraction.category || '').toLowerCase();
      let mappedTag: string = 'other';
      if (
        normalized.includes('accommodation') ||
        normalized.includes('lodging') ||
        normalized.includes('hotel') ||
        normalized.includes('resort') ||
        normalized.includes('hostel')
      ) {
        mappedTag = 'accommodation';
      } else if (
        normalized.includes('restaurant') ||
        normalized.includes('cafe') ||
        normalized.includes('bar') ||
        normalized.includes('food') ||
        normalized.includes('night')
      ) {
        mappedTag = 'food';
      } else if (
        normalized.includes('station') ||
        normalized.includes('airport') ||
        normalized.includes('bus') ||
        normalized.includes('train') ||
        normalized.includes('subway') ||
        normalized.includes('transit')
      ) {
        mappedTag = 'transportation';
      } else if (
        normalized.includes('museum') ||
        normalized.includes('temple') ||
        normalized.includes('historical') ||
        normalized.includes('gallery') ||
        normalized.includes('monument')
      ) {
        mappedTag = 'culture';
      } else if (
        normalized.includes('park') ||
        normalized.includes('beach') ||
        normalized.includes('garden') ||
        normalized.includes('zoo') ||
        normalized.includes('aquarium') ||
        normalized.includes('viewpoint') ||
        normalized.includes('natural')
      ) {
        mappedTag = 'nature';
      } else if (normalized.includes('shopping') || normalized.includes('market') || normalized.includes('mall')) {
        mappedTag = 'shopping';
      } else if (normalized.includes('theater') || normalized.includes('entertainment') || normalized.includes('amusement')) {
        mappedTag = 'entertainment';
      } else {
        mappedTag = 'activity';
      }

      const { error } = await supabase
        .from('ideas')
        .insert([
          {
            trip_id: params.id,
            title: attraction.name,
            description: attraction.description,
            location: attraction.location || trip?.destination,
            tags: [mappedTag],
            added_by: user.id,
            link_url: attraction.linkUrl || null,
            link_title: attraction.name || null,
            link_description: attraction.description || null,
            link_image: attraction.image || null
          }
        ]);

      if (error) throw error;

      toast.success(`"${attraction.name}" added to Ideas!`);
      // Remove the added item from chat lists
      setNearbyAttractions(prev => prev.filter(item => !(item.name === attraction.name && (item.location || '') === (attraction.location || ''))));
      setNearbyAccommodations(prev => prev.filter(item => !(item.name === attraction.name && (item.location || '') === (attraction.location || ''))));
      handleIdeaAdded(); // Refresh ideas
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error('Error adding attraction to ideas:', errorMessage);
      toast.error(`Failed to add "${attraction.name}" to Ideas: ${errorMessage}`);
    }
  };

  // Close AI chat sidebar
  const closeAIChatSidebar = () => {
    setShowAIChatSidebar(false);
    setSelectedDestination(null);
    setAiMessages([]);
    setNearbyAttractions([]);
  };
  const [activeDay, setActiveDay] = useState(1);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showUpdateInterestsModal, setShowUpdateInterestsModal] = useState(false);
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [showEditIdeaModal, setShowEditIdeaModal] = useState(false);
  const [showMoveToItineraryModal, setShowMoveToItineraryModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showInviteCollaboratorsModal, setShowInviteCollaboratorsModal] = useState(false);
  const [showShareTripGuideModal, setShowShareTripGuideModal] = useState(false);
  
  // Map nearby attraction category to itinerary activity_type for consistent labeling
  const mapAttractionCategoryToActivityType = (category: string): Activity['activity_type'] => {
    const c = category.toLowerCase();
    if (c.includes('restaurant') || c.includes('cafe') || c.includes('bar') || c.includes('night')) return 'food';
    if (c.includes('hotel') || c.includes('lodging') || c.includes('resort') || c.includes('hostel')) return 'accommodation';
    if (c.includes('station') || c.includes('airport') || c.includes('bus') || c.includes('train') || c.includes('subway') || c.includes('transit')) return 'transportation';
    return 'activity';
  };
  const [selectedRecommendation, setSelectedRecommendation] = useState<{ id: string; title: string; description: string } | null>(null);
  const [showTripActionsMenu, setShowTripActionsMenu] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
    isLoading?: boolean;
    variant?: 'danger' | 'warning';
    confirmText?: string;
    cancelText?: string;
  } | null>(null);
  const [showAIChatSidebar, setShowAIChatSidebar] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [nearbyAttractions, setNearbyAttractions] = useState<Array<{
    name: string;
    category: string;
    description: string;
    location?: string;
    rating?: number;
    distance?: string;
    image?: string;
    linkUrl?: string;
  }>>([]);
  const [attractionsLoading, setAttractionsLoading] = useState(false);
  const [nearbyAccommodations, setNearbyAccommodations] = useState<Array<{
    name: string;
    category: string;
    description: string;
    location?: string;
    rating?: number;
    image?: string;
    linkUrl?: string;
  }>>([]);
  const [accommodationsLoading, setAccommodationsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);

  // Helper functions for localStorage caching
  const getRecommendationsCacheKey = (tripId: string) => `ryoko_recommendations_${tripId}`;
  
  const saveRecommendationsToCache = (tripId: string, recommendations: TripRecommendation[]) => {
    try {
      const cacheKey = getRecommendationsCacheKey(tripId);
      localStorage.setItem(cacheKey, JSON.stringify(recommendations));
    } catch (error) {
      console.warn('Failed to save recommendations to cache:', error);
    }
  };

  const loadRecommendationsFromCache = (tripId: string): TripRecommendation[] => {
    try {
      const cacheKey = getRecommendationsCacheKey(tripId);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load recommendations from cache:', error);
    }
    return [];
  };

  const clearRecommendationsCache = (tripId: string) => {
    try {
      const cacheKey = getRecommendationsCacheKey(tripId);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to clear recommendations cache:', error);
    }
  };
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const weatherFetchRef = useRef<string>(''); // Track last fetched weather key to prevent duplicates


  // Drag and drop sensors
  // FIX: Add activation constraints to prevent simple clicks from being interpreted as drag attempts
  // This allows normal button clicks to pass through while still enabling drag functionality
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag only starts after moving 8px. Clicks pass through.
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Close trip actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking inside the menu or the trigger button
      if (target.closest('[data-trip-menu]') || target.closest('[data-trip-menu-trigger]')) {
        return;
      }
      if (showTripActionsMenu) {
        setShowTripActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTripActionsMenu]);

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        // Fetch trip details
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', params.id)
          .single();

        if (tripError) throw tripError;

        // Fetch activities for this trip
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('trip_id', params.id)
          .order('day_number', { ascending: true })
          .order('order_index', { ascending: true });

        if (activitiesError) throw activitiesError;

        // Fetch expenses for this trip (optional - table might not exist yet)
        let expensesData = [];
        try {
          const { data: expensesResult, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('trip_id', params.id)
            .order('expense_date', { ascending: false });
          
          if (expensesError) {
            console.warn('Expenses table not found or error:', expensesError);
            expensesData = [];
          } else {
            expensesData = expensesResult || [];
          }
        } catch (expensesError) {
          console.warn('Expenses query failed:', expensesError);
          expensesData = [];
        }

        // Fetch settlements for this trip (optional - table might not exist yet)
        let settlementsData = [];
        try {
          const { data: settlementsResult, error: settlementsError } = await supabase
            .from('settlements')
            .select('*')
            .eq('trip_id', params.id)
            .order('created_at', { ascending: false });
          
          if (settlementsError) {
            console.warn('Settlements table not found or error:', settlementsError);
            settlementsData = [];
          } else {
            settlementsData = settlementsResult || [];
          }
        } catch (settlementsError) {
          console.warn('Settlements query failed:', settlementsError);
          settlementsData = [];
        }

        // Fetch participants (collaborators + owner + current user)
        let profilesData = [];
        try {
          const participantIds = [tripData.owner_id, ...(tripData.collaborators || [])];
          // Ensure current user is included if not already in the list
          // Note: user might not be available yet, so we'll handle this in refreshParticipants
          const { data: profilesResult, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', participantIds);

          if (profilesError) {
            console.warn('Profiles query error:', profilesError);
            // Create a fallback participant for the owner
            profilesData = [{
              id: tripData.owner_id,
              name: 'Trip Owner'
            }];
          } else {
            profilesData = profilesResult || [];
          }
        } catch (profilesError) {
          console.warn('Profiles query failed:', profilesError);
          profilesData = [{
            id: tripData.owner_id,
            name: 'Trip Owner'
          }];
        }

        setTrip(tripData);
        setActivities(activitiesData || []);
        setExpenses(expensesData || []);
        setSettlements(settlementsData || []);
        setParticipants(profilesData || []);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch ideas for this trip (optional - table might not exist yet)
        let ideasData = [];
        let votesData = [];
        let commentsData = [];
        try {
          const { data: ideasResult, error: ideasError } = await supabase
            .from('ideas')
            .select('*')
            .eq('trip_id', params.id)
            .order('created_at', { ascending: false });
          
          if (ideasError) {
            console.warn('Ideas table not found or error:', ideasError);
            ideasData = [];
          } else {
            ideasData = ideasResult || [];
          }

          // Fetch votes for ideas
          if (ideasData.length > 0) {
            const { data: votesResult, error: votesError } = await supabase
              .from('idea_votes')
              .select('*')
              .in('idea_id', ideasData.map(idea => idea.id));
            
            if (!votesError) {
              votesData = votesResult || [];
            }
          }

          // Fetch comments for ideas
          if (ideasData.length > 0) {
            const { data: commentsResult, error: commentsError } = await supabase
              .from('idea_comments')
              .select('*')
              .in('idea_id', ideasData.map(idea => idea.id))
              .order('created_at', { ascending: true });
            
            if (!commentsError) {
              commentsData = commentsResult || [];
            }
          }
        } catch (ideasError) {
          console.warn('Ideas query failed:', ideasError);
          ideasData = [];
          votesData = [];
          commentsData = [];
        }

        setIdeas(ideasData);
        setIdeaVotes(votesData);
        setIdeaComments(commentsData);

        // Fetch weather data for the trip
        if (tripData.destination && tripData.start_date && tripData.end_date) {
          await fetchWeatherData(tripData.destination, tripData.start_date, tripData.end_date);
        }
      } catch (error) {
        console.error('Error fetching trip data:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        toast.error(`Failed to load trip details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchTripData();
    }

    // Refetch on window focus/visibility return
    const handleFocus = () => {
      if (params.id) fetchTripData();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocus();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

  }, [params.id, router]);

  // Refresh weather when trip dates/destination change (e.g., after editing trip)
  useEffect(() => {
    if (!trip) return;
    if (!trip.destination || !trip.start_date || !trip.end_date) return;
    
    // Only fetch if the weather key has actually changed
    const weatherKey = `${trip.destination}-${trip.start_date}-${trip.end_date}`;
    if (weatherFetchRef.current === weatherKey) {
      return; // Already fetched this exact weather data
    }
    
    // Clear current weather and refetch for new date range
    setWeatherData([]);
    fetchWeatherData(trip.destination, trip.start_date, trip.end_date);
  }, [trip?.destination, trip?.start_date, trip?.end_date]);

  // Realtime: as trip owner, see collaborators join immediately
  useEffect(() => {
    if (!trip?.id) return;
    
    // Helper to reload trip and participants to reflect latest collaborators
    const reloadTripAndParticipants = async () => {
      try {
        const { data: latestTrip, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', trip.id)
          .single();
        if (!error && latestTrip) {
          setTrip(latestTrip as any);
          // Build participants list from owner + collaborators
          const participantIds = [latestTrip.owner_id, ...(latestTrip.collaborators || [])];
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', participantIds);
          if (!profilesError) {
            setParticipants(profiles || []);
          }
        }
      } catch (e) {
        console.error('Failed to reload trip and participants:', e);
      }
    };
    // Subscribe to changes on this trip row (collaborators updates)
    const tripChannel = supabase
      .channel(`trip-collab-${trip.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${trip.id}`
      }, async (payload) => {
        try {
          // If the current user was removed from collaborators, notify and redirect
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          
          if (user && newRow) {
            const isOwner = newRow.owner_id === user.id;
            const isCollaborator = Array.isArray(newRow.collaborators) && newRow.collaborators.includes(user.id);
            if (!isOwner && !isCollaborator) {
              toast.error('You were removed from the trip');
              router.push('/dashboard');
              return;
            }
          }
          
          // Check if collaborators actually changed
          const oldCollaborators = Array.isArray(oldRow?.collaborators) ? oldRow.collaborators : [];
          const newCollaborators = Array.isArray(newRow?.collaborators) ? newRow.collaborators : [];
          
          // Only reload participants and show message if collaborators actually changed
          if (JSON.stringify(oldCollaborators.sort()) !== JSON.stringify(newCollaborators.sort())) {
            await reloadTripAndParticipants();
            toast.success('Trip collaborators updated');
          } else {
            // For other trip updates (title, description, etc.), just update the trip data without reloading participants
            setTrip(newRow);
          }
        } catch (e) {
          console.error('Failed to refresh participants after update:', e);
        }
      })
      .subscribe();

    // Also listen to invitations being accepted for this trip
    const inviteChannel = supabase
      .channel(`trip-invites-${trip.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'invitations'
      }, async (payload) => {
        try {
          const row = payload.new as { trip_id?: string; status?: string; invitee_email?: string };
          if (row?.trip_id === trip.id && row?.status === 'accepted') {
            await reloadTripAndParticipants();
            const email = row.invitee_email || 'A collaborator';
            toast.success(`${email} accepted your invitation`);
          }
        } catch (e) {
          console.error('Invitation acceptance handling failed:', e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tripChannel);
      supabase.removeChannel(inviteChannel);
    };
  }, [trip?.id]);

  // Realtime: activities and ideas CRUD sync for this trip
  useEffect(() => {
    if (!trip?.id) return;

    const tripId = trip.id;

    const activitiesChannel = supabase
      .channel(`activities-realtime-${tripId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        const row = payload.new as any;
        if (row?.trip_id !== tripId) return;
        setActivities(prev => {
          const exists = prev.some(a => a.id === row.id);
          return exists ? prev : [row, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'activities',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        const row = payload.new as any;
        if (row?.trip_id !== tripId) return;
        setActivities(prev => prev.map(a => a.id === row.id ? { ...a, ...row } : a));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'activities'
      }, (payload) => {
        const oldRow = payload.old as any;
        // Some Postgres publications don't include non-PK columns for DELETE events
        // unless REPLICA IDENTITY FULL is set. If trip_id is missing, still remove by id.
        if (oldRow?.trip_id && oldRow.trip_id !== tripId) return;
        if (!oldRow?.id) return;
        setActivities(prev => prev.filter(a => a.id !== oldRow.id));
      })
      .subscribe();

    const ideasChannel = supabase
      .channel(`ideas-realtime-${tripId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ideas',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        const row = payload.new as any;
        if (row?.trip_id !== tripId) return;
        setIdeas(prev => {
          const exists = prev.some(i => i.id === row.id);
          return exists ? prev : [row, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ideas',
        filter: `trip_id=eq.${tripId}`
      }, (payload) => {
        const row = payload.new as any;
        if (row?.trip_id !== tripId) return;
        setIdeas(prev => prev.map(i => i.id === row.id ? { ...i, ...row } : i));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'ideas'
      }, (payload) => {
        const oldRow = payload.old as any;
        if (oldRow?.trip_id !== tripId) return;
        setIdeas(prev => prev.filter(i => i.id !== oldRow.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(ideasChannel);
    };
  }, [trip?.id]);

  // Presence: show online collaborators viewing this trip with tab and day tracking
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string; currentTab: string; currentDay?: number }[]>([]);
  const presenceChannelRef = useRef<any>(null);
  
  useEffect(() => {
    if (!trip?.id || !user) return;

    const presenceChannel = supabase.channel(`presence:trip:${trip.id}`, {
      config: { presence: { key: user.id } }
    });
    presenceChannelRef.current = presenceChannel;

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState() as Record<string, Array<{ id: string; name: string; currentTab: string; currentDay?: number }>>;
      const users = Object.values(state).flat();
      
      // Only update if the data actually changed to prevent unnecessary re-renders
      setOnlineUsers(prev => {
        const prevIds = prev.map(u => u.id).sort();
        const newIds = users.map(u => u.id).sort();
        if (JSON.stringify(prevIds) === JSON.stringify(newIds)) {
          return prev; // No change in users, don't update
        }
        return users;
      });
    });

    presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      // No toast notification - green dot indicator is sufficient
    });

    presenceChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      // No action needed - cursors are handled by broadcast events
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const displayName = (participants.find((p: any) => p.id === user.id)?.name || user.email || 'Someone') as string;
        await presenceChannel.track({ 
          id: user.id, 
          name: displayName,
          currentTab: activeTab,
          currentDay: activeTab === 'itinerary' ? activeDay : undefined
        });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [trip?.id, user?.id, participants]);

  // Update presence when active tab or day changes (debounced)
  useEffect(() => {
    if (presenceChannelRef.current && user) {
      const timeoutId = setTimeout(() => {
        const displayName = (participants.find((p: any) => p.id === user.id)?.name || user.email || 'Someone') as string;
        presenceChannelRef.current.track({ 
          id: user.id, 
          name: displayName,
          currentTab: activeTab,
          currentDay: activeTab === 'itinerary' ? activeDay : undefined
        });
      }, 200); // Debounce tab/day changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, activeDay, user?.id, participants]);

  // Calculate expense summary when expenses or participants change
  useEffect(() => {
    if (expenses.length > 0 && participants.length > 0 && user) {
      calculateExpenseSummary(expenses);
    }
  }, [expenses, participants, user]);

  // Refresh participants when trip data changes (e.g., when someone accepts an invitation)
  useEffect(() => {
    if (trip && user) {
      refreshParticipants();
    }
  }, [trip?.owner_id, trip?.collaborators, user]);

  // Refresh participants when user becomes available
  useEffect(() => {
    if (trip && user && participants.length === 0) {
      refreshParticipants();
    }
  }, [user, trip]);

  // Load recommendations from cache when trip loads, or reset when trip changes
  useEffect(() => {
    if (trip?.id) {
      const cachedRecommendations = loadRecommendationsFromCache(trip.id);
      if (cachedRecommendations.length > 0) {
        setRecommendations(cachedRecommendations);
      } else {
        setRecommendations([]);
      }
    } else {
      setRecommendations([]);
    }
  }, [trip?.id]);

  // Subscribe to profile changes to refresh participants when avatars are updated
  useEffect(() => {
    if (!trip?.id) return;

    const profileChannel = supabase
      .channel(`profiles:${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${[trip.owner_id, ...(trip.collaborators || [])].join(',')})`
        },
        (payload) => {
          // Refresh participants when any profile is updated
          refreshParticipants();
        }
      )
      .subscribe();

    return () => {
      profileChannel.unsubscribe();
    };
  }, [trip?.id, trip?.owner_id, trip?.collaborators]);

  // Fetch activity logs when trip changes
  const fetchActivityLogsData = async () => {
    if (!trip?.id) return;
    
    setLoadingActivityLogs(true);
    try {
      const logs = await fetchActivityLogs(trip.id);
      setActivityLogs(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    } finally {
      setLoadingActivityLogs(false);
    }
  };

  useEffect(() => {
    fetchActivityLogsData();
  }, [trip?.id]);

  // Set up real-time subscription for activity logs
  useEffect(() => {
    if (!trip?.id || !user) return;

    // Debounce function to prevent rapid successive calls
    let debounceTimeout: NodeJS.Timeout;
    const debouncedFetchActivityLogs = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        fetchActivityLogsData();
      }, 1000); // 1 second debounce
    };

    const channel = supabase
      .channel(`activity_logs:${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `trip_id=eq.${trip.id}`,
        },
        async (payload) => {
          // Always refresh activity logs for realtime updates
          debouncedFetchActivityLogs();

          // Only show toast notifications for other users' actions
          if (payload.new.user_id === user.id) return;

          // Fetch the user name for the toast
          const { data: userData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.user_id)
            .single();

          const userName = userData?.name || 'Someone';
          const activityTitle = payload.new.title;

          // Show toast notification
          toast(`${userName} ${activityTitle.toLowerCase()}`, {
            duration: 4000,
            position: 'bottom-right',
            style: {
              background: '#363636',
              color: '#fff',
            },
          });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [trip?.id, user?.id]);

  // Refetch core trip data on window focus / visibility regain to avoid stale UI
  useEffect(() => {
    const refetchOnFocus = async () => {
      if (!params?.id) return;
      try {
        const { data: latestTrip } = await supabase
          .from('trips')
          .select('*')
          .eq('id', params.id)
          .single();
        if (latestTrip) setTrip(latestTrip as any);

        const { data: activitiesData } = await supabase
          .from('activities')
          .select('*')
          .eq('trip_id', params.id)
          .order('day_number', { ascending: true })
          .order('order_index', { ascending: true });
        if (activitiesData) setActivities(activitiesData as any);

        const { data: ideasData } = await supabase
          .from('ideas')
          .select('*')
          .eq('trip_id', params.id)
          .order('created_at', { ascending: false });
        if (ideasData) setIdeas(ideasData as any);
      } catch (e) {
        console.warn('Focus refetch failed:', e);
      }
    };

    const onFocus = () => { refetchOnFocus(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') refetchOnFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [params?.id]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transportation': return 'bg-yellow-100 text-yellow-800';
      case 'accommodation': return 'bg-blue-100 text-blue-800';
      case 'activity': return 'bg-green-100 text-green-800';
      case 'food': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-dark-medium';
    }
  };


  const getActivitiesForDay = (dayNumber: number) => {
    return activities
      .filter(activity => activity.day_number === dayNumber)
      .sort((a, b) => {
        // Sort by time period first, then by order_index
        const timePeriodOrder = { morning: 0, afternoon: 1, evening: 2 };
        const aPeriod = timePeriodOrder[a.time_period] ?? 3;
        const bPeriod = timePeriodOrder[b.time_period] ?? 3;
        
        if (aPeriod !== bPeriod) {
          return aPeriod - bPeriod;
        }
        
        return a.order_index - b.order_index;
      });
  };

  const getActivitiesForDayGroupedByTime = (dayNumber: number) => {
    const dayActivities = activities.filter(activity => activity.day_number === dayNumber);
    
    const grouped = {
      morning: dayActivities.filter(a => a.time_period === 'morning').sort((a, b) => a.order_index - b.order_index),
      afternoon: dayActivities.filter(a => a.time_period === 'afternoon').sort((a, b) => a.order_index - b.order_index),
      evening: dayActivities.filter(a => a.time_period === 'evening').sort((a, b) => a.order_index - b.order_index)
    };
    
    return grouped;
  };

  const getActivityCountForDay = (dayNumber: number) => {
    return activities.filter(activity => activity.day_number === dayNumber).length;
  };

  const getWeatherForDay = (dayNumber: number) => {
    if (!weatherData.length) return null;
    const dayDate = new Date(trip?.start_date || '');
    dayDate.setDate(dayDate.getDate() + (dayNumber - 1));
    const dateString = dayDate.toISOString().split('T')[0];
    return weatherData.find(weather => weather.date === dateString) || null;
  };

  // Multi-select helper functions
  const toggleActivitySelection = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const selectAllActivitiesForDay = () => {
    const dayActivities = getActivitiesForDay(activeDay);
    const allSelected = dayActivities.every(activity => selectedActivities.has(activity.id));
    
    if (allSelected) {
      // Deselect all activities for this day
      const newSelected = new Set(selectedActivities);
      dayActivities.forEach(activity => newSelected.delete(activity.id));
      setSelectedActivities(newSelected);
    } else {
      // Select all activities for this day
      const newSelected = new Set(selectedActivities);
      dayActivities.forEach(activity => newSelected.add(activity.id));
      setSelectedActivities(newSelected);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedActivities.size === 0) {
      toast.error('No activities selected');
      return;
    }

    const activityIds = Array.from(selectedActivities);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bulk delete operation timed out. Please try again.')), 30000);
    });

    try {
      await Promise.race([
        (async () => {
          const response = await fetch('/api/activities/bulk-delete', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              activityIds: activityIds,
              tripId: trip?.id,
              userId: user?.id
            })
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to delete activities');
          }

          // Refresh activities from database to ensure sync (non-blocking)
          handleActivityAdded().catch(err => {
            console.error('Error refreshing activities:', err);
          });
          setSelectedActivities(new Set());
          setIsMultiSelectMode(false);
          
          toast.success(`Successfully deleted ${activityIds.length} activities`);
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(`Failed to delete activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Drag start handler
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Drag over handler
  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over) {
      setDragOverId(over.id as string);
    } else {
      setDragOverId(null);
    }
  };

  // Drag end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setDragOverId(null);
    const { active, over } = event;

    if (!over) {
      return;
    }

    setIsReordering(true);

    try {
      // Check if dropped on another activity (same-time-period reordering)
      if (typeof over.id === 'string' && !over.id.startsWith('day-') && !over.id.startsWith('time-') && !over.id.startsWith('insert-')) {
        const activityToMove = activities.find(activity => activity.id === active.id);
        const targetActivity = activities.find(activity => activity.id === over.id);
        
        if (!activityToMove || !targetActivity) {
          throw new Error('Activity not found');
        }

        // Check if both activities are in the same day and time period
        if (activityToMove.day_number === targetActivity.day_number && 
            activityToMove.time_period === targetActivity.time_period) {
          
          // Get all activities in the same time period
          const timePeriodActivities = activities
            .filter(a => a.day_number === activityToMove.day_number && a.time_period === activityToMove.time_period)
            .sort((a, b) => a.order_index - b.order_index);

          const oldIndex = timePeriodActivities.findIndex(a => a.id === activityToMove.id);
          const newIndex = timePeriodActivities.findIndex(a => a.id === targetActivity.id);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            // Reorder activities within the same time period
            const reorderedActivities = arrayMove(timePeriodActivities, oldIndex, newIndex);
            const activitiesToUpdate = reorderedActivities.map((activity, index) => ({
              id: activity.id,
              order_index: index + 1,
              day_number: activity.day_number,
              time_period: activity.time_period
            }));

            const response = await fetch('/api/activities/reorder', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activities: activitiesToUpdate })
            });

            if (!response.ok) {
              throw new Error('Failed to update activity order');
            }

            toast.success('Activity reordered successfully');
            await handleActivityAdded();
            return;
          }
        }
      }

      // Check if dropped on a day tab (cross-day move)
      if (typeof over.id === 'string' && over.id.startsWith('day-')) {
        const targetDay = parseInt(over.id.replace('day-', ''));
        const activityToMove = activities.find(activity => activity.id === active.id);
        
        if (!activityToMove) {
          throw new Error('Activity not found');
        }

        if (activityToMove.day_number === targetDay) {
          // Same day, just reorder - but we need to handle this differently
          // since we're dropping on a day tab, not reordering within time periods
          return;
        } else {
          // Cross-day move
          const targetDayActivities = getActivitiesForDay(targetDay);
          const newOrderIndex = targetDayActivities.length + 1;

          const response = await fetch('/api/activities/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              activities: [{
                id: activityToMove.id,
                order_index: newOrderIndex,
                day_number: targetDay
              }]
            })
          });

          if (!response.ok) {
            throw new Error('Failed to move activity to new day');
          }

          toast.success(`Activity moved to Day ${targetDay}`);
        }
      } else if (typeof over.id === 'string' && over.id.startsWith('time-')) {
        // Dropped into a time period (append to end)
        const [, targetDayStr, targetTimePeriod] = over.id.split('-');
        const targetDay = parseInt(targetDayStr);
        const activityToMove = activities.find(activity => activity.id === active.id);
        
        if (!activityToMove) {
          throw new Error('Activity not found');
        }

        // Get activities in the target time period to calculate new order
        const targetTimeActivities = activities
          .filter(a => a.day_number === targetDay && a.time_period === targetTimePeriod)
          .sort((a, b) => a.order_index - b.order_index);
        
        const newOrderIndex = targetTimeActivities.length + 1;

        const response = await fetch('/api/activities/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            activities: [{
              id: activityToMove.id,
              order_index: newOrderIndex,
              day_number: targetDay,
              time_period: targetTimePeriod
            }]
          })
        });

        if (!response.ok) {
          throw new Error('Failed to move activity to time period');
        }

        const timePeriodLabels = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
        toast.success(`Activity moved to ${timePeriodLabels[targetTimePeriod as keyof typeof timePeriodLabels]} of Day ${targetDay}`);
      } else if (typeof over.id === 'string' && over.id.startsWith('insert-')) {
        // Dropped at a specific insertion point
        const [, targetDayStr, targetTimePeriod, insertIndexStr] = over.id.split('-');
        const targetDay = parseInt(targetDayStr);
        const insertIndex = parseInt(insertIndexStr);
        const activityToMove = activities.find(activity => activity.id === active.id);
        
        if (!activityToMove) {
          throw new Error('Activity not found');
        }

        // Get activities in the target time period
        const targetTimeActivities = activities
          .filter(a => a.day_number === targetDay && a.time_period === targetTimePeriod)
          .sort((a, b) => a.order_index - b.order_index);

        // Calculate new order index based on insertion point
        let newOrderIndex: number;
        if (insertIndex === 0) {
          // Inserting at the beginning
          newOrderIndex = 1;
        } else if (insertIndex >= targetTimeActivities.length) {
          // Inserting at the end
          newOrderIndex = targetTimeActivities.length + 1;
        } else {
          // Inserting between activities
          newOrderIndex = insertIndex + 1;
        }

        // Update order indices for activities that come after the insertion point
        const activitiesToUpdate = [];
        
        // Add the moved activity
        activitiesToUpdate.push({
          id: activityToMove.id,
          order_index: newOrderIndex,
          day_number: targetDay,
          time_period: targetTimePeriod
        });

        // Update order indices for existing activities that need to shift
        for (const activity of targetTimeActivities) {
          if (activity.id !== activityToMove.id && activity.order_index >= newOrderIndex) {
            activitiesToUpdate.push({
              id: activity.id,
              order_index: activity.order_index + 1,
              day_number: activity.day_number,
              time_period: activity.time_period
            });
          }
        }

        const response = await fetch('/api/activities/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: activitiesToUpdate })
        });

        if (!response.ok) {
          throw new Error('Failed to insert activity at position');
        }

        const timePeriodLabels = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
        toast.success(`Activity inserted into ${timePeriodLabels[targetTimePeriod as keyof typeof timePeriodLabels]} of Day ${targetDay}`);
      } else {
        // Same-day reorder
        const dayActivities = getActivitiesForDay(activeDay);
        const oldIndex = dayActivities.findIndex(activity => activity.id === active.id);
        
        if (oldIndex === -1) {
          return;
        }

        const newIndex = dayActivities.findIndex(activity => activity.id === over.id);
        if (newIndex === -1) {
          return;
        }

        const reorderedActivities = arrayMove(dayActivities, oldIndex, newIndex);
        const activitiesToUpdate = reorderedActivities.map((activity, index) => ({
          id: activity.id,
          order_index: index + 1,
          day_number: activity.day_number
        }));

        const response = await fetch('/api/activities/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: activitiesToUpdate })
        });

        if (!response.ok) {
          throw new Error('Failed to update activity order');
        }

        toast.success('Activity reordered successfully');
      }

      // Refresh activities from database to ensure sync
      await handleActivityAdded();
    } catch (error) {
      console.error('Drag operation error:', error);
      toast.error(`Failed to move activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsReordering(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleExpenseUpdated = async (expenseData?: { title: string; amount: number; userId: string }) => {
    // Refresh expenses data
    await handleExpenseAdded();
    
    // Log the activity if data is provided
    if (expenseData && trip && user) {
      await ActivityLogger.expenseEdited(trip.id, user.id, expenseData.title, expenseData.amount);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    const expenseTitle = expense?.description || 'this expense';
    
    showConfirmation(
      'Delete Expense',
      `Are you sure you want to delete "${expenseTitle}"? This action cannot be undone.`,
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Delete operation timed out. Please try again.')), 20000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId);

              if (error) {
                console.error('Error deleting expense:', error);
                throw new Error(`Failed to delete expense: ${error.message}`);
              }

              // Log the activity (non-blocking)
              if (trip && user) {
                ActivityLogger.expenseDeleted(trip.id, user.id, expenseTitle)
                  .catch(err => console.error('Error logging expense deletion:', err));
              }

              toast.success('Expense deleted successfully');
              
              // Refresh expenses (non-blocking)
              handleExpenseAdded().catch(err => {
                console.error('Error refreshing expenses:', err);
              });
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Delete expense error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to delete expense: ${errorMessage}`);
          throw error;
        }
      }
    );
  };

  const calculateExpenseSummary = (expensesList: Expense[]) => {
    if (!user || participants.length === 0) return;

    let totalExpenses = 0;
    let userPaid = 0;
    let userShare = 0;

    expensesList.forEach(expense => {
      totalExpenses += expense.amount;
      
      if (expense.paid_by === user.id) {
        userPaid += expense.amount;
      }

      // Calculate user's share based on split type
      if (expense.split_with === 'everyone') {
        // Split equally among all participants
        const shareAmount = expense.amount / participants.length;
        userShare += shareAmount;
      } else if (Array.isArray(expense.split_with)) {
        // Check if custom amounts are provided
        if (expense.split_amounts && Object.keys(expense.split_amounts).length > 0) {
          // Use custom amount for this user
          const customAmount = expense.split_amounts[user.id];
          if (customAmount) {
            userShare += customAmount;
          }
        } else {
          // Split equally among selected participants
          if (expense.split_with.includes(user.id)) {
            const shareAmount = expense.amount / expense.split_with.length;
            userShare += shareAmount;
          }
        }
      }
    });

    setExpenseSummary({
      totalExpenses,
      userPaid,
      userShare
    });
  };

  const handleTripUpdated = async (updateType?: string) => {
    // Refresh trip data
    if (params.id) {
      try {
        const { data: tripData, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', params.id)
          .single();

        if (!error && tripData) {
          setTrip(tripData);
        }
      } catch (error) {
        console.warn('Failed to refresh trip:', error);
      }
    }

    // Log the activity if update type is provided
    if (updateType && trip && user) {
      await ActivityLogger.tripUpdated(trip.id, user.id, updateType);
    }
  };

  const handleInvitesSent = async () => {
    // Refresh participants after invites are sent
    await refreshParticipants();
  };

  const handleInterestsUpdated = async () => {
    // Refresh trip data after interests are updated
    await handleTripUpdated('interests');
  };

  const handleActivityAdded = async (activityData?: { title: string; dayNumber: number }) => {
    // Refresh activities data
    if (params.id) {
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select('*')
        .eq('trip_id', params.id)
        .order('day_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (!error) {
        setActivities(activitiesData || []);
      }
    }

    // Log the activity if data is provided
    if (activityData && trip && user) {
      await ActivityLogger.activityAdded(trip.id, user.id, activityData.title, activityData.dayNumber);
    }
  };

  const fetchWeatherData = useCallback(async (destination: string, startDate: string, endDate: string) => {
    if (!destination || !startDate || !endDate) return;
    
    // Create a unique key for this weather fetch to prevent duplicate requests
    const weatherKey = `${destination}-${startDate}-${endDate}`;
    if (weatherFetchRef.current === weatherKey) {
      return; // Already fetched this exact weather data
    }
    
    weatherFetchRef.current = weatherKey;
    setLoadingWeather(true);
    
    try {
      const response = await fetch(
        `/api/weather?destination=${encodeURIComponent(destination)}&startDate=${startDate}&endDate=${endDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data.weather || []);
      } else {
        console.warn('Weather service not available');
        setWeatherData([]); // Set empty array to show "Not Available"
      }
    } catch (error) {
      console.warn('Weather fetch error:', error);
      setWeatherData([]); // Set empty array to show "Not Available"
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  const handleExpenseAdded = async (expenseData?: { title: string; amount: number; userId: string }) => {
    // Refresh expenses data
    if (params.id) {
      const { data: expensesData, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', params.id)
        .order('expense_date', { ascending: false });

      if (!error) {
        setExpenses(expensesData || []);
        calculateExpenseSummary(expensesData || []);
      }
    }

    // Log the activity if data is provided
    if (expenseData && trip && user) {
      await ActivityLogger.expenseAdded(trip.id, user.id, expenseData.title, expenseData.amount);
    }
  };

  const handleIdeaAdded = async (ideaData?: { title: string }) => {
    // Refresh ideas data
    if (params.id) {
      try {
        const { data: ideasData, error } = await supabase
          .from('ideas')
          .select('*')
          .eq('trip_id', params.id)
          .order('created_at', { ascending: false });

        if (!error) {
          setIdeas(ideasData || []);
        }

        // Also refresh votes
        const { data: votesData, error: votesError } = await supabase
          .from('idea_votes')
          .select('*')
          .in('idea_id', (ideasData || []).map(idea => idea.id));

        if (!votesError) {
          setIdeaVotes(votesData || []);
        }
      } catch (error) {
        console.warn('Failed to refresh ideas:', error);
      }
    }

    // Log the activity if data is provided
    if (ideaData && trip && user) {
      await ActivityLogger.ideaAdded(trip.id, user.id, ideaData.title);
    }
  };

  const handleIdeaUpdated = async (ideaData?: { title: string }) => {
    // Refresh ideas data
    await handleIdeaAdded();
    
    // Log the activity if data is provided
    if (ideaData && trip && user) {
      await ActivityLogger.ideaEdited(trip.id, user.id, ideaData.title);
    }
  };

  const handleVoteIdea = async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) return;

    try {
      // Check if user already voted
      const existingVote = ideaVotes.find(vote => vote.idea_id === ideaId && vote.user_id === user.id);
      
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking same vote type
          const { error } = await supabase
            .from('idea_votes')
            .delete()
            .eq('id', existingVote.id);
          
          if (error) throw error;
          
          // Update vote counts in ideas table
          const idea = ideas.find(i => i.id === ideaId);
          if (idea) {
            const { error: updateError } = await supabase
              .from('ideas')
              .update({
                upvotes: voteType === 'upvote' ? idea.upvotes - 1 : idea.upvotes,
                downvotes: voteType === 'downvote' ? idea.downvotes - 1 : idea.downvotes
              })
              .eq('id', ideaId);
            
            if (updateError) throw updateError;
          }
        } else {
          // Change vote type
          const { error } = await supabase
            .from('idea_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
          
          if (error) throw error;
          
          // Update vote counts in ideas table
          const idea = ideas.find(i => i.id === ideaId);
          if (idea) {
            const { error: updateError } = await supabase
              .from('ideas')
              .update({
                upvotes: voteType === 'upvote' ? idea.upvotes + 1 : idea.upvotes - 1,
                downvotes: voteType === 'downvote' ? idea.downvotes + 1 : idea.downvotes - 1
              })
              .eq('id', ideaId);
            
            if (updateError) throw updateError;
          }
        }
      } else {
        // Add new vote
        const { error } = await supabase
          .from('idea_votes')
          .insert({
            idea_id: ideaId,
            user_id: user.id,
            vote_type: voteType
          });
        
        if (error) throw error;
        
        // Update vote counts in ideas table
        const idea = ideas.find(i => i.id === ideaId);
        if (idea) {
          const { error: updateError } = await supabase
            .from('ideas')
            .update({
              upvotes: voteType === 'upvote' ? idea.upvotes + 1 : idea.upvotes,
              downvotes: voteType === 'downvote' ? idea.downvotes + 1 : idea.downvotes
            })
            .eq('id', ideaId);
          
          if (updateError) throw updateError;
        }
      }
      
      // Refresh ideas and votes to get updated counts
      await handleIdeaAdded();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
  };

  const handleMoveToItinerary = (idea: Idea) => {
    setSelectedIdea(idea);
    setShowMoveToItineraryModal(true);
  };

  const refreshParticipants = async () => {
    // Refresh participants data
    if (trip) {
      try {
        const participantIds = [trip.owner_id, ...(trip.collaborators || [])];
        // Ensure current user is included if not already in the list
        if (user && !participantIds.includes(user.id)) {
          participantIds.push(user.id);
        }
        
        
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', participantIds);

        if (!error) {
          // Add email placeholder for now - in a real app, you'd fetch this from auth.users
          const participantsWithEmail = (profilesData || []).map(profile => ({
            ...profile,
            email: `${profile.name.toLowerCase().replace(/\s+/g, '')}@example.com` // Placeholder email
          }));
          setParticipants(participantsWithEmail);
        } else {
          console.error('Error fetching profiles:', error);
        }
      } catch (error) {
        console.error('Error refreshing participants:', error);
      }
    }
  };

  const handleArchiveTrip = async () => {
    showConfirmation(
      'Archive Trip',
      `Are you sure you want to archive "${trip?.title}"? It will be hidden from your active trips.`,
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Archive operation timed out. Please try again.')), 15000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('trips')
                .update({ archived: true })
                .eq('id', trip?.id);

              if (error) {
                console.error('Error archiving trip:', error);
                throw new Error(`Failed to archive trip: ${error.message}`);
              }

              toast.success('Trip archived successfully!');
              router.push('/dashboard');
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Archive trip error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to archive trip: ${errorMessage}`);
          throw error;
        }
      },
      'warning',
      'Yes, archive it',
      'No, keep active'
    );
  };

  const handleCompleteTrip = async () => {
    showConfirmation(
      'Complete Trip',
      `Are you sure you want to mark "${trip?.title}" as completed?`,
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Complete operation timed out. Please try again.')), 15000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('trips')
                .update({ completed: true })
                .eq('id', trip?.id);

              if (error) {
                console.error('Error completing trip:', error);
                throw new Error(`Failed to complete trip: ${error.message}`);
              }

              toast.success('Trip marked as completed!');
              handleTripUpdated('completed').catch(err => {
                console.error('Error updating trip:', err);
              });
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Complete trip error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to complete trip: ${errorMessage}`);
          throw error;
        }
      },
      'warning',
      'Yes, complete it',
      'No, keep active'
    );
  };

  const handleActivateTrip = async () => {
    showConfirmation(
      'Activate Trip',
      `Are you sure you want to set "${trip?.title}" as active? This will remove it from archived/completed status.`,
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Activate operation timed out. Please try again.')), 15000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('trips')
                .update({ 
                  completed: false,
                  archived: false 
                })
                .eq('id', trip?.id);

              if (error) {
                console.error('Error activating trip:', error);
                throw new Error(`Failed to activate trip: ${error.message}`);
              }

              toast.success('Trip set as active!');
              handleTripUpdated('activated').catch(err => {
                console.error('Error updating trip:', err);
              });
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Activate trip error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to activate trip: ${errorMessage}`);
          throw error;
        }
      },
      'warning',
      'Yes, activate it',
      'No, keep current status'
    );
  };

  const handleDeleteTrip = async () => {
    showConfirmation(
      'Delete Trip',
      `Are you sure you want to delete "${trip?.title}"? This action cannot be undone and will delete all activities, expenses, and ideas.`,
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Delete operation timed out. Please try again.')), 20000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', trip?.id);

              if (error) {
                console.error('Error deleting trip:', error);
                throw new Error(`Failed to delete trip: ${error.message}`);
              }

              toast.success('Trip deleted successfully!');
              router.push('/dashboard');
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Delete trip error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to delete trip: ${errorMessage}`);
          throw error;
        }
      }
    );
  };

  const getTripDays = () => {
    if (!trip) return 1;
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleCommentsUpdated = async () => {
    // Refresh comments for all ideas
    if (ideas.length > 0) {
      try {
        const { data: commentsData, error } = await supabase
          .from('idea_comments')
          .select('*')
          .in('idea_id', ideas.map(idea => idea.id))
          .order('created_at', { ascending: true });

        if (!error) {
          setIdeaComments(commentsData || []);
        }
      } catch (error) {
        console.warn('Failed to refresh comments:', error);
      }
    }
  };

  const handleToggleComments = (ideaId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId);
    } else {
      newExpanded.add(ideaId);
    }
    setExpandedComments(newExpanded);
  };

  const handleAddComment = async (ideaId: string) => {
    const commentText = newCommentText[ideaId];
    if (!commentText?.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          content: commentText.trim()
        });

      if (error) throw error;

      toast.success('Comment added!');
      setNewCommentText(prev => ({ ...prev, [ideaId]: '' }));
      handleCommentsUpdated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    showConfirmation(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Delete operation timed out. Please try again.')), 15000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('idea_comments')
                .delete()
                .eq('id', commentId);

              if (error) {
                console.error('Error deleting comment:', error);
                throw new Error(`Failed to delete comment: ${error.message}`);
              }

              toast.success('Comment deleted!');
              handleCommentsUpdated().catch(err => {
                console.error('Error refreshing comments:', err);
              });
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Delete comment error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to delete comment: ${errorMessage}`);
          throw error;
        }
      }
    );
  };

  const handleEditIdea = (idea: Idea) => {
    setSelectedIdea(idea);
    setShowEditIdeaModal(true);
  };

  const handleDeleteIdea = async (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    const ideaTitle = idea?.title || 'this idea';

    showConfirmation(
      'Delete Idea',
      `Are you sure you want to delete "${ideaTitle}"? This action cannot be undone.`,
      async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Delete operation timed out. Please try again.')), 20000);
        });

        try {
          await Promise.race([
            (async () => {
              const { error } = await supabase
                .from('ideas')
                .delete()
                .eq('id', ideaId);

              if (error) {
                console.error('Error deleting idea:', error);
                throw new Error(`Failed to delete idea: ${error.message}`);
              }

              // Log the activity (non-blocking)
              if (trip && user) {
                ActivityLogger.ideaDeleted(trip.id, user.id, ideaTitle)
                  .catch(err => console.error('Error logging idea deletion:', err));
              }

              toast.success('Idea deleted successfully!');
              
              // Refresh ideas (non-blocking)
              handleIdeaAdded().catch(err => {
                console.error('Error refreshing ideas:', err);
              });
            })(),
            timeoutPromise
          ]);
        } catch (error: unknown) {
          console.error('Delete idea error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to delete idea: ${errorMessage}`);
          throw error;
        }
      }
    );
  };

  // Helper function to get unpaid settlements (those not in the settlements table)
  const getUnpaidSettlements = () => {
    const calculatedSettlements = calculateSettlements();
    return calculatedSettlements.filter(calculatedSettlement => {
      return !settlements.some(settlement => 
        settlement.from_user_id === calculatedSettlement.fromId &&
        settlement.to_user_id === calculatedSettlement.toId &&
        Math.abs(settlement.amount - calculatedSettlement.amount) < 0.01 // Allow for small floating point differences
      );
    });
  };

  // Helper function to get paid settlements
  const getPaidSettlements = () => {
    return settlements.filter(settlement => settlement.is_paid === true);
  };

  // Function to mark a settlement as paid
  const markSettlementAsPaid = async (settlement: { fromId: string; fromName: string; toId: string; toName: string; amount: number }) => {
    try {
      const { error } = await supabase
        .from('settlements')
        .insert([
          {
            trip_id: params.id,
            from_user_id: settlement.fromId,
            to_user_id: settlement.toId,
            amount: settlement.amount,
            is_paid: true,
            paid_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Refresh settlements data
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('settlements')
        .select('*')
        .eq('trip_id', params.id)
        .order('created_at', { ascending: false });

      if (!settlementsError) {
        setSettlements(settlementsData || []);
      }

      toast.success(`Marked ${settlement.fromName} → ${settlement.toName} as paid`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to mark as paid: ${errorMessage}`);
    }
  };

  // Function to mark a settlement as unpaid
  const markSettlementAsUnpaid = async (settlementId: string) => {
    try {
      const { error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', settlementId);

      if (error) throw error;

      // Refresh settlements data
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('settlements')
        .select('*')
        .eq('trip_id', params.id)
        .order('created_at', { ascending: false });

      if (!settlementsError) {
        setSettlements(settlementsData || []);
      }

      toast.success('Settlement marked as unpaid');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to mark as unpaid: ${errorMessage}`);
    }
  };


  // Function to mark settlement as paid from inline display
  const handleMarkSettlementAsPaid = async (settlement: { fromId: string; fromName: string; toId: string; toName: string; amount: number }) => {
    try {
      const { error } = await supabase
        .from('settlements')
        .insert([
          {
            trip_id: params.id,
            from_user_id: settlement.fromId,
            to_user_id: settlement.toId,
            amount: settlement.amount,
            is_paid: true,
            paid_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Log the payment activity
      if (user && trip) {
        ActivityLogger.expenseSettled(
          trip.id,
          user.id,
          settlement.amount,
          `${settlement.fromName} has paid ${settlement.toName} $${settlement.amount.toFixed(2)}`
        );
      }

      // Refresh settlements data
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('settlements')
        .select('*')
        .eq('trip_id', params.id)
        .order('created_at', { ascending: false });

      if (!settlementsError) {
        setSettlements(settlementsData || []);
      }

      toast.success(`Marked ${settlement.fromName} → ${settlement.toName} as paid`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to mark as paid: ${errorMessage}`);
    }
  };

  // Function to generate AI recommendations
  const generateRecommendations = async (browseInterests?: string[]) => {
    // Capture trip and participants at the start to avoid stale closures
    const currentTrip = trip;
    const currentParticipants = participants;
    
    if (!currentTrip) return;

    setGeneratingRecommendations(true);

    try {
      // Use selected interests if provided, otherwise use trip interests
      const interestsToUse = browseInterests && browseInterests.length > 0 
        ? browseInterests 
        : (currentTrip.interests || []);

      const tripData = {
        destination: currentTrip.destination,
        interests: interestsToUse,
        numberOfDays: Math.ceil((new Date(currentTrip.end_date).getTime() - new Date(currentTrip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        numberOfParticipants: currentParticipants.length,
        startDate: currentTrip.start_date,
      };
      
      // Use real API with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout (just under Vercel's limit)
      
      try {
        const response = await fetch('/api/enhanced-recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tripData }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || 'Failed to generate recommendations');
        }

        const data = await response.json();
        const newRecommendations = data.recommendations || [];
        setRecommendations(newRecommendations);
        
        // Save to cache - use captured trip ID to avoid stale closure
        if (currentTrip?.id) {
          saveRecommendationsToCache(currentTrip.id, newRecommendations);
        }
        
        toast.success('Recommendations generated successfully!');
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. The recommendation generation is taking longer than expected. Please try again.');
      } else {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(`Failed to generate recommendations: ${errorMessage}`);
      }
    } finally {
      // Always reset loading state, even if component unmounts
      setGeneratingRecommendations(false);
    }
  };


  // Function to generate more recommendations
  const generateMoreRecommendations = async () => {
    if (!trip) return;

    setGeneratingMore(true);
    try {
      // Get existing place IDs to exclude
      const excludePlaceIds = recommendations.map(rec => rec.place_id).filter(Boolean);

      const tripData = {
        trip_id: trip.id,
        destination: trip.destination,
        interests: trip.interests || [],
        numberOfDays: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        numberOfParticipants: participants.length,
        startDate: trip.start_date,
        excludePlaceIds
      };
      
      // Use real API with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout
      
      try {
        const response = await fetch('/api/enhanced-recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tripData }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || 'Failed to generate more recommendations');
        }

        const data = await response.json();
        
        // Append new recommendations to existing ones
        setRecommendations(prev => {
          const updated = [...prev, ...data.recommendations];
          
          // Save to cache
          if (trip?.id) {
            saveRecommendationsToCache(trip.id, updated);
          }
          
          return updated;
        });
        toast.success(`Added ${data.recommendations.length} more recommendations!`);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. The recommendation generation is taking longer than expected. Please try again.');
      } else {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(`Failed to generate more recommendations: ${errorMessage}`);
      }
    } finally {
      setGeneratingMore(false);
    }
  };

  // Function to map recommendation activity types to idea tag values
  const mapActivityTypeToTag = (activityType: string): string => {
    const mapping: { [key: string]: string } = {
      'Food': 'food',
      'Culture': 'culture',
      'History': 'history',
      'Nature': 'nature',
      'Shopping': 'shopping',
      'Entertainment': 'activity',
      'Sports': 'activity',
      'Religion': 'culture',
      'Transportation': 'transportation',
      'Accommodation': 'accommodation',
      'Activity': 'activity'
    };
    return mapping[activityType] || 'other';
  };

  const [movingRecommendationIds, setMovingRecommendationIds] = useState<Set<string>>(new Set());
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Function to handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${trip?.id}-${Date.now()}.${fileExt}`;
      const filePath = `trip-images/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update the trip record
      const { error: updateError } = await supabase
        .from('trips')
        .update({ trip_image_url: publicUrl })
        .eq('id', trip?.id);

      if (updateError) {
        throw updateError;
      }

      // Update the trip state
      setTrip(prev => prev ? { ...prev, trip_image_url: publicUrl } : null);
      toast.success('Trip image updated successfully!');
      setShowTripActionsMenu(false);

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Function to handle image removal
  const handleRemoveImage = async () => {
    try {
      setUploadingImage(true);

      // Update the trip record to remove the image
      const { error: updateError } = await supabase
        .from('trips')
        .update({ trip_image_url: null })
        .eq('id', trip?.id);

      if (updateError) {
        throw updateError;
      }

      // Update the trip state
      setTrip(prev => prev ? { ...prev, trip_image_url: undefined } : null);
      toast.success('Trip image removed successfully!');
      setShowTripActionsMenu(false);

    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };


  // Function to move recommendation to ideas
  const moveRecommendationToIdeas = async (recommendation: TripRecommendation) => {
    // Guard against double-triggering - check first before any async operations
    if (movingRecommendationIds.has(recommendation.id)) return;
    
    // Capture values at start to avoid stale closures
    const currentUser = user;
    const currentTripId = trip?.id;
    const tripId = params.id;
    
    // Ensure user is available BEFORE adding to moving set to avoid stuck state
    if (!currentUser) {
      toast.error('Your session seems to have expired. Please refresh and sign in again to add ideas.');
      return;
    }

    // Add to moving set after validation
    setMovingRecommendationIds(prev => new Set(prev).add(recommendation.id));
    
    try {
      const mappedTag = mapActivityTypeToTag(recommendation.activity_type);
      
      const { error } = await supabase
        .from('ideas')
        .insert([
          {
            trip_id: tripId,
            title: recommendation.title,
            description: recommendation.description,
            location: recommendation.location,
            link_url: recommendation.relevant_link,
            link_title: recommendation.title,
            link_description: recommendation.description,
            link_image: recommendation.image_url,
            tags: [mappedTag],
            added_by: currentUser.id
          }
        ]);

      if (error) throw error;

      // Refresh ideas data
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (!ideasError) {
        const uniqueIdeas = (ideasData || []).filter((idea, index, self) =>
          self.findIndex(i => i.id === idea.id) === index
        );
        setIdeas(uniqueIdeas);
      }

      // Remove from recommendations
      setRecommendations(prev => {
        const updated = prev.filter(rec => rec.id !== recommendation.id);
        
        // Save to cache - use captured trip ID to avoid stale closure
        if (currentTripId) {
          saveRecommendationsToCache(currentTripId, updated);
        }
        
        return updated;
      });
      
      // Show success toast
      toast.success(`"${recommendation.title}" added to Ideas!`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error('Error moving recommendation to ideas:', errorMessage);
      toast.error(`Failed to add "${recommendation.title}" to Ideas: ${errorMessage}`);
    } finally {
      // Always clear moving state, even on error
      setMovingRecommendationIds(prev => {
        const next = new Set(prev);
        next.delete(recommendation.id);
        return next;
      });
    }
  };

  const calculateSettlements = () => {
    if (!participants.length) return [];

    const balances: Record<string, number> = {};
    const participantMap: Record<string, string> = {};

    // Initialize balances and create participant map
    participants.forEach(participant => {
      balances[participant.id] = 0;
      participantMap[participant.id] = participant.name;
    });

    // Calculate balances
    expenses.forEach(expense => {
      const splitWith = expense.split_with;
      const splitAmounts = expense.split_amounts || {};
      
      // Add to paid by person
      balances[expense.paid_by] += expense.amount;
      
      // Determine how to split the expense
      if (splitWith === 'everyone') {
        // Split equally among all participants
        const shareAmount = expense.amount / participants.length;
        participants.forEach(participant => {
          balances[participant.id] -= shareAmount;
        });
      } else if (Array.isArray(splitWith)) {
        // Check if custom amounts are provided
        if (Object.keys(splitAmounts).length > 0) {
          // Use custom amounts
          Object.entries(splitAmounts).forEach(([userId, amount]) => {
            balances[userId] -= amount;
          });
        } else {
          // Split equally among selected participants
          const shareAmount = expense.amount / splitWith.length;
          splitWith.forEach(participantId => {
            balances[participantId] -= shareAmount;
          });
        }
      }
    });

    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors: { id: string; name: string; amount: number }[] = [];
    const debtors: { id: string; name: string; amount: number }[] = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance > 0.01) { // Small threshold to avoid rounding errors
        creditors.push({
          id: userId,
          name: participantMap[userId],
          amount: balance
        });
      } else if (balance < -0.01) {
        debtors.push({
          id: userId,
          name: participantMap[userId],
          amount: Math.abs(balance)
        });
      }
    });

    // Sort by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Generate optimized settlements
    const settlements: { 
      fromId: string; 
      fromName: string; 
      toId: string; 
      toName: string; 
      amount: number 
    }[] = [];

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const settlementAmount = Math.min(creditor.amount, debtor.amount);
      
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: settlementAmount
      });

      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;

      if (creditor.amount < 0.01) {
        creditorIndex++;
      }
      if (debtor.amount < 0.01) {
        debtorIndex++;
      }
    }

    return settlements;
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowEditActivityModal(true);
  };

  const handleActivityUpdated = async (activityData?: { title: string; dayNumber: number }) => {
    // Refresh activities data
    await handleActivityAdded();
    
    // Log the activity if data is provided
    if (activityData && trip && user) {
      await ActivityLogger.activityEdited(trip.id, user.id, activityData.title, activityData.dayNumber);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    const activityTitle = activity?.title || 'this activity';
    
    showConfirmation(
      'Delete Activity',
      `Are you sure you want to delete "${activityTitle}"? This action cannot be undone.`,
      async () => {
        // Helper function to create timeout promise
        const createTimeout = (duration: number, message: string) => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), duration);
          });
        };

        try {
          // First, get the activity to find its attachments (with separate timeout - 15 seconds)
          const fetchResult = await Promise.race([
            supabase
              .from('activities')
              .select('attachments')
              .eq('id', activityId)
              .single(),
            createTimeout(15000, 'Failed to fetch activity data. Please try again.')
          ]) as { data: any; error: any };

          const { data: activityData, error: fetchError } = fetchResult;

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching activity:', fetchError);
            throw new Error(`Failed to fetch activity: ${fetchError.message}`);
          }

          // Delete files from storage if they exist (with separate timeout - 30 seconds for file operations)
          if (activityData?.attachments && activityData.attachments.length > 0) {
            try {
              await Promise.race([
                deleteActivityFiles(activityData.attachments),
                createTimeout(30000, 'File deletion is taking longer than expected. The activity will still be deleted.')
              ]);
            } catch (fileError) {
              console.warn('Error deleting files (continuing with activity deletion):', fileError);
              // Continue with activity deletion even if file deletion fails or times out
            }
          }

          // Delete the activity from database (with separate timeout - 20 seconds)
          const deleteResult = await Promise.race([
            supabase
              .from('activities')
              .delete()
              .eq('id', activityId),
            createTimeout(20000, 'Delete operation timed out. Please check your connection and try again.')
          ]) as { error: any };

          const { error: deleteError } = deleteResult;

          if (deleteError) {
            console.error('Error deleting activity:', deleteError);
            throw new Error(`Failed to delete activity: ${deleteError.message}`);
          }

          // Log the activity (non-blocking)
          if (trip && user) {
            ActivityLogger.activityDeleted(trip.id, user.id, activityTitle, activity?.day_number || 1)
              .catch(err => console.error('Error logging activity deletion:', err));
          }

          toast.success('Activity deleted successfully!');
          
          // Refresh activities (non-blocking)
          handleActivityAdded().catch(err => {
            console.error('Error refreshing activities:', err);
            // Still show success since deletion worked
          });
        } catch (error: unknown) {
          console.error('Delete activity error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast.error(`Failed to delete activity: ${errorMessage}`);
          throw error; // Re-throw to trigger error handling in showConfirmation
        }
      }
    );
  };

  const deleteActivityFiles = async (attachments: (string | {url: string, customName: string})[]) => {
    try {
      for (const attachment of attachments) {
        // Handle both old format (string) and new format (object)
        const fileUrl = typeof attachment === 'string' ? attachment : attachment.url;
        
        // Extract file path from URL
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(-2).join('/'); // trip-attachments/activity-id/filename
        
        const { error } = await supabase.storage
          .from('trip-files')
          .remove([filePath]);

        if (error) {
          console.error('Error deleting file:', error);
          // Continue with other files even if one fails
        }
      }
    } catch (error) {
      console.error('Error parsing file URLs:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const generateDays = () => {
    if (!trip?.start_date || !trip?.end_date) return [];
    
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const days = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayNumber: number = days.length + 1;
      days.push({
        day: dayNumber,
        date: new Date(d),
        activities: getActivityCountForDay(dayNumber)
      });
    }
    
    return days;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <DotLottieReact
              src="https://lottie.host/ae057893-3e0e-4fac-957c-bcc92b7b2c7d/m83xpaXe5w.lottie"
              loop
              autoplay
              style={{ width: '120px', height: '120px' }}
            />
            <p className="mt-4 text-gray-600">Loading trip details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!trip) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-dark mb-4">Trip not found</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="cursor-pointer bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const days = generateDays();
  const currentDay = days[activeDay - 1];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Back Button and API Toggle */}
        <div className="pt-20 pb-4">
          <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to trip selection
            </button>
            
          </div>
        </div>

        {/* Trip Overview Section */}
        <div className="max-w-[1400px] mx-auto px-4 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trip Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
              {/* Trip Actions Menu */}
              {(user?.id === trip?.owner_id || true) && (
                <div className="absolute top-4 right-4 z-10" data-trip-menu-trigger>
                  <button
                    ref={dropdownButtonRef}
                    onClick={() => {
                      if (dropdownButtonRef.current) {
                        const rect = dropdownButtonRef.current.getBoundingClientRect();
                        setDropdownPosition({
                          top: rect.bottom + window.scrollY + 8,
                          right: window.innerWidth - rect.right - window.scrollX
                        });
                      }
                      setShowTripActionsMenu(!showTripActionsMenu);
                    }}
                    className="cursor-pointer p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600 hover:text-gray-800 cursor-pointer" />
                  </button>
                  
                  {showTripActionsMenu && typeof window !== 'undefined' && createPortal(
                    <div 
                      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-[9999] max-h-[400px] overflow-y-auto" 
                      data-trip-menu
                      style={{
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowEditTripModal(true);
                          setShowTripActionsMenu(false);
                        }}
                        className="cursor-pointer w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowShareTripGuideModal(true);
                          setShowTripActionsMenu(false);
                        }}
                        className="cursor-pointer w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        {trip?.shared_to_social ? 'Edit Trip Guide' : 'Share Trip as Guide'}
                      </button>
                      {/* Show different options based on trip status */}
                      {trip?.completed || trip?.archived ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                            handleActivateTrip();
                            setShowTripActionsMenu(false);
                          }}
                          className="cursor-pointer w-full px-3 py-1.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Set as Active
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                          handleCompleteTrip();
                          setShowTripActionsMenu(false);
                        }}
                            className="cursor-pointer w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                            Mark Complete
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchiveTrip();
                          setShowTripActionsMenu(false);
                        }}
                            className="cursor-pointer w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4" />
                        Archive Trip
                      </button>
                        </>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fileInputRef.current?.click();
                          setShowTripActionsMenu(false);
                        }}
                        disabled={uploadingImage}
                        className="cursor-pointer w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            Upload
                          </>
                        )}
                      </button>
                      {trip?.trip_image_url && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                          disabled={uploadingImage}
                          className="cursor-pointer w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteTrip();
                          setShowTripActionsMenu(false);
                        }}
                        className="cursor-pointer w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Delete Trip
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
              )}

              {/* Hidden file input for image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <TripImageHeader 
                tripId={trip.id}
                destination={trip.destination || ''}
                tripImageUrl={trip.trip_image_url}
                className="h-64 w-full"
                onImageUpdate={(imageUrl) => {
                  // Update the trip state with the new image URL
                  setTrip(prev => prev ? { ...prev, trip_image_url: imageUrl || undefined } : null);
                }}
              >
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold drop-shadow-lg">{trip.title}</h1>
                    {trip.completed && (
                      <span className="px-2 py-1 bg-green-500/80 text-white text-xs font-medium rounded-full drop-shadow-sm">
                        Completed
                      </span>
                    )}
                    {trip.archived && (
                      <span className="px-2 py-1 bg-gray-500/80 text-white text-xs font-medium rounded-full drop-shadow-sm">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 drop-shadow-sm" />
                    <span className="text-sm drop-shadow-sm">{trip.destination || 'No destination set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 drop-shadow-sm" />
                    <span className="text-sm drop-shadow-sm">
                      {trip.start_date && trip.end_date 
                        ? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`
                        : 'No dates set'
                      }
                    </span>
                  </div>
                </div>
                {trip.description && (
                  <div className="absolute top-4 right-4 left-4">
                    <p className="text-white text-sm drop-shadow-sm line-clamp-2">{trip.description}</p>
                  </div>
                )}
              </TripImageHeader>
            </div>

            {/* Group Interests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-dark">Group Interests</h3>
                <button 
                  onClick={() => {
                    setShowUpdateInterestsModal(true);
                  }}
                  type="button"
                  className="cursor-pointer text-sm text-gray-500 hover:text-[#ff5a58] transition-colors font-medium"
                >
                  Update Interests
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {trip.interests && trip.interests.length > 0 ? (
                  trip.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-[#ff5a58] text-[#ff5a58] text-white rounded-full text-sm font-medium border-none"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <div className="text-center w-full py-4">
                    <span className="text-form text-sm">No interests selected</span>
                    <p className="text-xs text-gray-500 mt-1">Add interests to get personalized recommendations</p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-dark">Participants</h3>
                <button 
                  onClick={() => {
                    setShowInviteCollaboratorsModal(true);
                  }}
                  className="cursor-pointer text-sm text-gray-500 hover:text-[#ff5a58] transition-colors font-medium"
                >
                  Invite Participants
                </button>
              </div>
              <div className="space-y-3">
                {/* Show trip owner as creator */}
                {(() => {
                  const tripOwner = participants.find(p => p.id === trip.owner_id);
                  
                  // If no trip owner found in participants, show a fallback
                  if (!tripOwner && participants.length === 0) {
                    return (
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xs text-white font-medium">L</span>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">Loading...</span>
                        <span className="px-2 py-1  text-red-800 text-xs rounded-full font-medium border border-red-200">Creator</span>
                      </div>
                    );
                  }
                  
                  const isOnline = tripOwner ? onlineUsers.some(u => u.id === tripOwner.id) : false;
                  
                  return (
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="relative">
                      <Avatar 
                        name={tripOwner?.name || 'Unknown'} 
                        imageUrl={tripOwner?.avatar_url}
                        size="md"
                        onClick={() => tripOwner && setSelectedUserId(tripOwner.id)}
                      />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <span className="text-sm text-gray-700 font-medium">
                        {tripOwner?.name || 'Trip Owner'}
                      </span>
                      <span className="px-2 py-1 text-gray-400 bg-gray-200 text-xs rounded-full font-medium border-none">Creator</span>
                    </div>
                  );
                })()}
                {trip.collaborators && trip.collaborators.length > 0 ? (
                  trip.collaborators.map((collaboratorId, index) => {
                    const collaborator = participants.find(p => p.id === collaboratorId);
                    const isOnline = onlineUsers.some(u => u.id === collaboratorId);
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="relative">
                        <Avatar 
                          name={collaborator?.name || 'Unknown'} 
                          imageUrl={collaborator?.avatar_url}
                          size="md"
                          onClick={() => setSelectedUserId(collaboratorId)}
                        />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          {collaborator?.name || 'Unknown User'}
                        </span>
                        <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs rounded-full font-medium border border-blue-200">Collaborator</span>
                        {user && trip.owner_id === user.id && (
                          <button
                            onClick={() => {
                              // Confirm removal
                              showConfirmation(
                                'Remove collaborator?',
                                `This will remove ${collaborator?.name || 'this user'} from the trip collaborators.`,
                                async () => {
                                  try {
                                    const current = Array.isArray(trip.collaborators) ? trip.collaborators : [];
                                    const updated = current.filter((id: string) => id !== collaboratorId);
                                    
                                    // Update trip collaborators
                                    const { error } = await supabase
                                      .from('trips')
                                      .update({ collaborators: updated })
                                      .eq('id', trip.id);
                                    if (error) throw error;

                                    // Also clean up invitation records to prevent constraint violations when re-inviting
                                    // We'll call an API endpoint that can properly handle this with admin privileges
                                    try {
                                      const response = await fetch('/api/remove-collaborator', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                                        },
                                        body: JSON.stringify({
                                          tripId: trip.id,
                                          collaboratorId: collaboratorId
                                        })
                                      });
                                      
                                      if (!response.ok) {
                                        console.warn('Failed to clean up invitation records');
                                      }
                                    } catch (cleanupError) {
                                      console.warn('Could not clean up invitation records:', cleanupError);
                                    }

                                    toast.success('Collaborator removed');
                                    // Optimistically update using functional form to avoid stale closure issues
                                    setTrip(prev => prev ? { ...prev, collaborators: updated } : null);
                                    refreshParticipants();
                                  } catch (e) {
                                    console.error('Failed to remove collaborator:', e);
                                    toast.error('Failed to remove collaborator');
                                  }
                                },
                                'danger',
                                'Remove',
                                "Cancel"
                              );
                            }}
                            className="cursor-pointer ml-auto text-xs text-red-600 hover:text-red-700 px-2 py-1 border border-red-200 rounded-md"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <span className="text-form text-sm">No collaborators yet</span>
                    <p className="text-xs text-gray-500 mt-1">Invite friends to collaborate on this trip</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1400px] mx-auto px-4 mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto scrollbar-hide">
            <div className="flex space-x-1 min-w-max">
              {['Itinerary', 'Idea Board', 'Recommendations', 'Expenses', 'Gallery', 'Recent Activities'].map((tab) => {
                const tabKey = tab.toLowerCase().replace(/\s+/g, '');
                const usersInTab = onlineUsers.filter(u => u.currentTab === tabKey && u.id !== user?.id);
                
                return (
                <button
                  key={tab}
                    onClick={() => setActiveTab(tabKey)}
                    className={`cursor-pointer relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === tabKey
                      ? 'bg-[#ff5a58] text-white'
                      : 'text-gray-600 hover:text-dark'
                  }`}
                >
                    <span>{tab}</span>
                    {usersInTab.length > 0 && (
                      <div className="flex -space-x-1">
                        {usersInTab.slice(0, 3).map((user, index) => {
                          const participant = participants.find(p => p.id === user.id);
                          return (
                            <div
                              key={user.id}
                              className={`${activeTab === tabKey ? 'border-white' : 'border-gray-100'}`}
                            >
                              <Avatar
                                name={user.name}
                                imageUrl={participant?.avatar_url}
                                size="sm"
                                className="border-2"
                                onClick={() => setSelectedUserId(user.id)}
                              />
                            </div>
                          );
                        })}
                        {usersInTab.length > 3 && (
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            activeTab === tabKey ? 'border-white' : 'border-gray-100'
                          } bg-gray-400 flex items-center justify-center text-xs font-medium text-white`}>
                            +{usersInTab.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-4 pb-8 relative" data-main-content>
          {/* Live Cursors - show based on tab and day context */}
          {user && (
            <RealtimeCursors 
              roomName={activeTab === 'itinerary' 
                ? `cursors:trip:${trip?.id}:tab:${activeTab}:day:${activeDay}`
                : `cursors:trip:${trip?.id}:tab:${activeTab}`
              }
              username={participants.find((p: any) => p.id === user.id)?.name || user.email || 'Someone'}
              userId={user.id}
            />
          )}
          
          {activeTab === 'itinerary' ? (
            <TextSelectionAI 
              context="itinerary"
              tripData={trip ? {
                destination: trip.destination,
                interests: trip.interests || [],
                numberOfDays: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
                numberOfParticipants: participants.length,
                startDate: trip.start_date
              } : undefined}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Left Sidebar - Days */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-dark">Days</h3>
                      {loadingWeather && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Loading weather...</span>
                        </div>
                      )}
                    </div>
                  <p className="text-sm text-gray-500 mb-4">Select a day to view itinerary</p>
                  <div className="space-y-2">
                    {days.map((day, index) => (
                      <DroppableDay
                        key={index}
                        day={day}
                        isActive={activeDay === day.day}
                        onDayClick={setActiveDay}
                        formatDate={formatDate}
                        onUserClick={(userId) => setSelectedUserId(userId)}
                        weather={getWeatherForDay(day.day)}
                        getWeatherIconComponent={getWeatherIconComponent}
                        onlineUsers={onlineUsers}
                        currentUserId={user?.id}
                        participants={participants}
                      />
                    ))}
                  </div>
                </div>
              </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2 items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#ff5a58]" />
                        <h2 className="text-xl font-bold text-[#ff5a58]">
                          Day {activeDay}
                          {currentDay && (
                            <span className="text-sm text-gray-500 ml-2">
                              {getDayName(currentDay.date.toISOString())}, {formatDate(currentDay.date.toISOString())}
                            </span>
                          )}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Multi-select controls */}
                        {getActivitiesForDay(activeDay).length > 0 && (
                          <>
                      <button 
                              onClick={() => {
                                setIsMultiSelectMode(!isMultiSelectMode);
                                if (isMultiSelectMode) {
                                  setSelectedActivities(new Set());
                                }
                              }}
                              className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                isMultiSelectMode 
                                  ? 'bg-[#0B486B] text-white hover:bg-[#093751]' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {isMultiSelectMode ? (
                                <>
                                  <Square className="w-4 h-4" />
                                  Cancel
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Select
                                </>
                              )}
                      </button>
                            
                            {isMultiSelectMode && (
                              <>
                                <button 
                                  onClick={selectAllActivitiesForDay}
                                  className="cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                                >
                                  {getActivitiesForDay(activeDay).every(activity => selectedActivities.has(activity.id)) ? 'Deselect All' : 'Select All'}
                                </button>
                                
                                {selectedActivities.size > 0 && (
                                <button 
                                    onClick={() => {
                                      handleBulkDelete();
                                    }}
                                    type="button"
                                    className="cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                    Delete ({selectedActivities.size})
                                </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                        
                        <button 
                          onClick={async () => {
                            if (!trip?.id) return;
                            const shareableUrl = `${window.location.origin}/trip/view/${trip.id}`;
                            try {
                              await navigator.clipboard.writeText(shareableUrl);
                              toast.success('Shareable link copied to clipboard!');
                            } catch (error) {
                              // Fallback for older browsers
                              const textArea = document.createElement('textarea');
                              textArea.value = shareableUrl;
                              document.body.appendChild(textArea);
                              textArea.select();
                              try {
                                document.execCommand('copy');
                                toast.success('Shareable link copied to clipboard!');
                              } catch (err) {
                                toast.error('Failed to copy link');
                              }
                              document.body.removeChild(textArea);
                            }
                          }}
                          className="cursor-pointer border border-[#ff5a58] text-[#ff5a58] hover:bg-[#ff5a58] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Share Itinerary
                        </button>
                        <button 
                          onClick={() => {
                            setShowAddActivityModal(true);
                          }}
                          type="button"
                          className="cursor-pointer bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Activities
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {isReordering && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                          <span className="text-sm text-gray-600">Updating activity order...</span>
                              </div>
                            )}
                      {getActivitiesForDay(activeDay).length > 0 ? (
                        <>
                          <SortableContext
                            items={getActivitiesForDay(activeDay).map(activity => activity.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {(() => {
                              const groupedActivities = getActivitiesForDayGroupedByTime(activeDay);
                              const timePeriods = [
                                { key: 'morning', label: 'Morning', icon: '' },
                                { key: 'afternoon', label: 'Afternoon', icon: '' },
                                { key: 'evening', label: 'Evening', icon: '' }
                              ];
                              
                              return timePeriods.map((period) => {
                                const periodActivities = groupedActivities[period.key as keyof typeof groupedActivities];
                                  
                                  return (
                                  <TimePeriodSection
                                    key={period.key}
                                    period={period}
                                    periodActivities={periodActivities}
                                    activeDay={activeDay}
                                    dragOverId={dragOverId}
                                    activeId={activeId}
                                    selectedActivities={selectedActivities}
                                    toggleActivitySelection={toggleActivitySelection}
                                    handleEditActivity={handleEditActivity}
                                    handleDeleteActivity={handleDeleteActivity}
                                    getTypeColor={getTypeColor}
                                    isMultiSelectMode={isMultiSelectMode}
                                    onAskAI={handleDestinationAskAI}
                                  />
                                );
                              });
                            })()}
                          </SortableContext>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <h3 className="text-lg font-medium text-dark mb-2">No activities yet</h3>
                          <p className="text-form mb-6">Add your first activity to start planning your day!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <DragOverlay>
                {activeId ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg opacity-90 transform rotate-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-pointer" />
                      <span className="font-semibold text-dark">
                        {activities.find(a => a.id === activeId)?.title}
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
              </DndContext>
            </TextSelectionAI>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'ideaboard' && (
                    <TextSelectionAI 
                      context="ideas"
                      tripData={trip ? {
                        destination: trip.destination,
                        interests: trip.interests || [],
                        numberOfDays: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
                        numberOfParticipants: participants.length,
                        startDate: trip.start_date
                      } : undefined}
                    >
                      <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-dark">Collaborate on Trip Ideas and Vote on Activities</h2>
                        <p className="text-gray-600 mt-1">Share inspiration and decide what to do together</p>
                      </div>
                        <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowAddIdeaModal(true);
                        }}
                        type="button"
                        className="cursor-pointer bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                            Add Idea
                      </button>
                        </div>
                    </div>

                    {/* Category Filter */}
                      <div className="flex gap-2 flex-wrap mb-6">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === 'all'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{ 
                          backgroundColor: selectedCategory === 'all' ? '#ef4444' : '#f3f4f6',
                          border: 'none',
                          outline: 'none'
                        }}
                      >
                        All
                      </button>
                      {['food', 'transportation', 'accommodation', 'activity', 'shopping', 'nature', 'history', 'culture', 'other'].map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                            selectedCategory === category
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          style={{ 
                            backgroundColor: selectedCategory === category ? '#ef4444' : '#f3f4f6',
                            border: 'none',
                            outline: 'none'
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    {/* Ideas Grid */}
                    <div className="grid gap-6">
                      {ideas
                        .filter(idea => selectedCategory === 'all' || idea.tags.includes(selectedCategory))
                        .map((idea) => {
                          const addedByParticipant = participants.find(p => p.id === idea.added_by);
                          const userVote = ideaVotes.find(vote => vote.idea_id === idea.id && vote.user_id === user?.id);
                          const ideaCommentsList = ideaComments.filter(comment => comment.idea_id === idea.id);

                          return (
                            <div key={idea.id} className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                              <div className="flex px-4 py-2 items-center">
                                {/* Image - Only show if there's an image */}
                                {idea.link_image && (
                                  <div className="w-32 h-32 bg-gray-100 flex-shrink-0">
                                    <img 
                                      src={idea.link_image} 
                                      alt={idea.title}
                                      className="w-full h-full object-cover rounded-xl"
                                    />
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <LocationTooltip 
                                          locationText={idea.title} 
                                          onAskAI={() => handleDestinationAskAI(idea.title)}
                                        >
                                          <h3 className="text-lg font-semibold text-dark mb-1 hover:text-blue-600 transition-colors cursor-pointer underline decoration-dotted decoration-transparent hover:decoration-blue-600">{idea.title}</h3>
                                        </LocationTooltip>
                                      
                                      {/* Tags */}
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {idea.tags.map((tag) => (
                                          <span key={tag} className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            tag === 'food' ? 'bg-green-100 text-green-800' :
                                            tag === 'transportation' ? 'bg-blue-100 text-blue-800' :
                                            tag === 'accommodation' ? 'bg-purple-100 text-purple-800' :
                                            tag === 'activity' ? 'bg-green-100 text-green-800' :
                                            tag === 'shopping' ? 'bg-pink-100 text-pink-800' :
                                            tag === 'nature' ? 'bg-emerald-100 text-emerald-800' :
                                            tag === 'history' ? 'bg-amber-100 text-amber-800' :
                                            tag === 'culture' ? 'bg-indigo-100 text-indigo-800' :
                                            tag === 'other' ? 'bg-gray-100 text-gray-800' :
                                            'bg-gray-100 text-dark-medium'
                                          }`}>
                                            {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="ml-4">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="More options"
                                          >
                                            <MoreVertical className="w-4 h-4 cursor-pointer" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-48 p-2" align="end">
                                          <div className="space-y-1">
                                            <button
                                              onClick={() => handleEditIdea(idea)}
                                              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                            >
                                              <Edit className="w-4 h-4" />
                                              Edit Idea
                                            </button>
                                            <button
                                              onClick={() => handleDeleteIdea(idea.id)}
                                              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Delete Idea
                                            </button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  </div>

                                  {/* Description - Full width underneath */}
                                  <div className="w-full mb-3">
                                    {idea.description && (
                                      <p className="text-gray-600 text-sm">{idea.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Enhanced Details */}
                              <div className="px-4 pb-4">
                                <div className="space-y-2">
                                  {/* Location */}
                                  {idea.location && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500" data-location={idea.location}>
                                      <MapPin className="w-4 h-4" />
                                      <span>{idea.location}</span>
                                    </div>
                                  )}

                                  {/* Link Preview */}
                                  {idea.link_url && (
                                    <>
                                      <div className="flex items-center gap-1 text-sm">
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                        <a 
                                          href={idea.link_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          {idea.link_title || idea.link_url}
                                        </a>
                                      </div>
                                      {idea.link_description && (
                                        <div className="text-sm text-gray-500">
                                          {idea.link_description}
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Voting and Actions */}
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 gap-3 md:gap-0">
                                    {/* Voting, comment */}
                                    <div className="flex items-center gap-4">
                                      <button
                                        onClick={() => handleVoteIdea(idea.id, 'upvote')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                                          userVote?.vote_type === 'upvote'
                                            ? 'bg-[#ff5a58] text-white cursor-pointer'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                                        }`}
                                      >
                                        <img 
                                          src={userVote?.vote_type === 'upvote' ? '/assets/bone.svg' : '/assets/bone-plain.svg'} 
                                          alt="Like" 
                                          className="w-4 h-4"
                                          style={userVote?.vote_type === 'upvote' ? {
                                            filter: 'brightness(0) invert(1)'
                                          } : {
                                            filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
                                          }}
                                        />
                                        <span className={`text-sm font-medium ${userVote?.vote_type === 'upvote' ? 'text-white' : ''}`}>
                                          {idea.upvotes}
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => handleVoteIdea(idea.id, 'downvote')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                                          userVote?.vote_type === 'downvote'
                                            ? 'bg-[#ff5a58] text-white cursor-pointer'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                                        }`}
                                      >
                                        <img 
                                          src={userVote?.vote_type === 'downvote' ? '/assets/bone-crack.svg' : '/assets/bone-broken-plain.svg'} 
                                          alt="Dislike" 
                                          className="w-4 h-4"
                                          style={userVote?.vote_type === 'downvote' ? {
                                            filter: 'brightness(0) invert(1)'
                                          } : {
                                            filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
                                          }}
                                        />
                                        <span className={`text-sm font-medium ${userVote?.vote_type === 'downvote' ? 'text-white' : ''}`}>
                                          {idea.downvotes}
                                        </span>
                                      </button>
                                      <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <MessageCircle className="w-4 h-4" />
                                        <button
                                          onClick={() => handleToggleComments(idea.id)}
                                          className="hover:text-gray-700 transition-colors"
                                        >
                                          {ideaCommentsList.length}
                                        </button>
                                      </div>
                                    </div>

                                    {/* 
                                      Row for "Move to Itinerary" and Added By (placement swaps responsively)
                                      
                                      On small screens:
                                        - Move to Itinerary becomes its own row (w-full, mb-2)
                                        - Added By avatar aligns right, at end of card
                                    */}
                                    {/* Second row: Move to Itinerary + Added By.
                                        - On small screens: this whole block is a new row under the votes,
                                          with button and avatar side-by-side.
                                        - On md+ screens: layout matches previous inline behavior. */}
                                    <div className="flex flex-row items-center justify-between md:justify-start gap-3 w-full md:w-auto">
                                      {/* Move to Itinerary is its own row on mobile, inline on desktop */}
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault(); // Keep preventDefault to stop form submission if wrapped
                                          try {
                                            handleMoveToItinerary(idea);
                                          } catch (err) {
                                            console.error('Unhandled error in handleMoveToItinerary:', err);
                                            toast.error('Failed to open move dialog. Please try again.');
                                          }
                                        }}
                                        className="order-2 md:order-1 cursor-pointer bg-[#0B486B] hover:bg-[#093751] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 
                                          w-auto mb-0"
                                      >
                                        <Plus className="w-3 h-3" />
                                        Move to Itinerary
                                      </button>
                                      
                                      {/* Added By - right aligned on mobile, inline on desktop */}
                                      <div className="order-1 md:order-2 flex items-center gap-2 text-sm text-gray-500 md:ml-2 justify-end md:justify-start w-auto">
                                        <span className="text-xs">Added By:</span>
                                        <Avatar 
                                          name={addedByParticipant?.name || 'Unknown'} 
                                          imageUrl={addedByParticipant?.avatar_url}
                                          size="sm"
                                          onClick={() => addedByParticipant && setSelectedUserId(addedByParticipant.id)}
                                        />
                                        <span>{addedByParticipant?.name || 'Unknown'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Comments Section Below Card */}
                              {expandedComments.has(idea.id) && (
                                <div className="border-t bg-gray-50 p-4">
                                  {/* Comments List */}
                                  <div className="space-y-3 mb-4">
                                    {ideaCommentsList.length === 0 ? (
                                      <p className="text-sm text-form text-center py-2">No comments yet. Be the first to comment!</p>
                                    ) : (
                                      ideaCommentsList.map((comment) => {
                                        const commenter = participants.find(p => p.id === comment.user_id);
                                        const isOwnComment = user?.id === comment.user_id;

                                        return (
                                          <div key={comment.id} className="flex gap-3">
                                            <Avatar 
                                              name={commenter?.name || 'Unknown'} 
                                              imageUrl={commenter?.avatar_url}
                                              size="sm"
                                              className="flex-shrink-0"
                                              onClick={() => commenter && setSelectedUserId(commenter.id)}
                                            />
                                            <div className="flex-1">
                                              <div className="bg-white rounded-lg p-3 shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-medium text-sm text-dark">
                                                    {commenter?.name || 'Unknown'}
                                                  </span>
                                                  <span className="text-xs text-gray-500">
                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                  </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{comment.content}</p>
                                              </div>
                                              {isOwnComment && (
                                                <button
                                                  onClick={() => handleDeleteComment(comment.id)}
                                                  className="text-xs text-red-600 hover:text-red-800 mt-1"
                                                >
                                                  Delete
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Add Comment */}
                                  <div className="flex gap-3">
                                    <Avatar 
                                      name={user?.email || 'Unknown'} 
                                      imageUrl={participants.find(p => p.id === user?.id)?.avatar_url}
                                      size="sm"
                                      className="flex-shrink-0"
                                      onClick={() => user?.id && setSelectedUserId(user.id)}
                                    />
                                    <div className="flex-1">
                                      <textarea
                                        value={newCommentText[idea.id] || ''}
                                        onChange={(e) => setNewCommentText(prev => ({ ...prev, [idea.id]: e.target.value }))}
                                        placeholder="Write a comment..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent resize-none text-sm"
                                        rows={2}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleAddComment(idea.id)}
                                      disabled={!newCommentText[idea.id]?.trim()}
                                      className="px-3 max-h-[40px] bg-[#ff5a58] text-white rounded-lg hover:bg-[#ff4a47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                                    >
                                      Send
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Empty State */}
                    {ideas.filter(idea => selectedCategory === 'all' || idea.tags.includes(selectedCategory)).length === 0 && (
                      <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-dark mb-2">No ideas yet</h3>
                        <p className="text-form mb-6">
                          {selectedCategory === 'all' 
                            ? 'Start adding ideas to collaborate on your trip!'
                            : `No ${selectedCategory} ideas yet. Add some inspiration!`
                          }
                        </p>
                      </div>
                    )}
                    </TextSelectionAI>
                )}

                {activeTab === 'recommendations' && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-dark">AI Trip Recommendations</h2>
                        <p className="text-gray-600 mt-1">Get personalized suggestions based on your trip details</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Keep preventDefault to stop form submission if wrapped
                          generateRecommendations().catch(err => {
                            console.error('Unhandled error in generateRecommendations:', err);
                          });
                        }}
                        disabled={generatingRecommendations}
                        className="cursor-pointer bg-[#ff5a58] hover:bg-[#ff4a47] text-white text-sm px-6 py-3 rounded-lg font-medium transition-all duration-200 transform disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 self-end md:self-auto"
                      >
                        {generatingRecommendations ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            Generate Recommendations
                          </>
                        )}
                      </button>
                    </div>

                    {/* Loading State */}
                    {generatingRecommendations && (
                  <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#ff5a58] mx-auto mb-4" />
                        <p className="text-gray-600">Generating personalized recommendations...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                    </div>
                    )}

                    {/* Recommendations Grid */}
                    {!generatingRecommendations && recommendations.length > 0 && (
                      <div className="grid gap-6">
                        {recommendations.map((recommendation) => (
                            <div key={recommendation.id} className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex px-4 py-2 items-center">
                              {/* Image - Only show if there's an image */}
                              {recommendation.image_url && (
                                <div className="w-32 h-32 bg-gray-100 flex-shrink-0">
                                  <img 
                                    src={recommendation.image_url} 
                                    alt={recommendation.title}
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                      <LocationTooltip 
                                        locationText={recommendation.title} 
                                        onAskAI={() => handleDestinationAskAI(recommendation.title)}
                                      >
                                        <h3 className="text-lg font-semibold text-dark mb-1 hover:text-blue-600 transition-colors cursor-pointer underline decoration-dotted decoration-transparent hover:decoration-blue-600">{recommendation.title}</h3>
                                      </LocationTooltip>
                                    
                                    {/* Activity Type Badge and Rating */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {recommendation.activity_type.split(',').map((type, index) => (
                                          <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            type.trim() === 'transportation' ? 'bg-blue-100 text-blue-800' :
                                            type.trim() === 'accommodation' ? 'bg-purple-100 text-purple-800' :
                                            type.trim() === 'activity' ? 'bg-green-100 text-green-800' :
                                            type.trim() === 'food' ? 'bg-orange-100 text-orange-800' :
                                            type.trim() === 'shopping' ? 'bg-pink-100 text-pink-800' :
                                            type.trim() === 'nature' ? 'bg-emerald-100 text-emerald-800' :
                                            type.trim() === 'history' ? 'bg-amber-100 text-amber-800' :
                                            type.trim() === 'culture' ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {type.trim().charAt(0).toUpperCase() + type.trim().slice(1)}
                                          </span>
                                        ))}
                                      </div>
                                      
                                        {/* Google Places Rating - Clickable */}
                                      {recommendation.rating && (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(recommendation.title + ' ' + recommendation.location)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded transition-colors cursor-pointer"
                                            title="View all reviews on Google Maps"
                                          >
                                          <Star className="w-3 h-3 text-yellow-500" />
                                          <span className="text-sm font-medium text-gray-700">
                                            {recommendation.rating.toFixed(1)}
                                          </span>
                                          {recommendation.user_ratings_total && (
                                            <span className="text-xs text-gray-500">
                                              ({recommendation.user_ratings_total.toLocaleString()} reviews)
                                            </span>
                                          )}
                                            <ExternalLink className="w-3 h-3 text-gray-400 ml-1" />
                                          </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Button */}
                                  <div className="ml-4">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault(); // Keep preventDefault to stop form submission if wrapped
                                        moveRecommendationToIdeas(recommendation).catch(err => {
                                          console.error('Unhandled error in moveRecommendationToIdeas:', err);
                                        });
                                      }}
                                      className="cursor-pointer bg-[#0B486B] hover:bg-[#093751] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                      <Plus className="w-4 h-4 cursor-pointer" />
                                      Add to Ideas
                                    </button>
                                  </div>
                                </div>

                                {/* Description - Full width underneath */}
                                <div className="w-full">
                                  <p className="text-gray-600 text-sm">{recommendation.description}</p>
                                </div>
                              </div>
                            </div>

                            {/* Enhanced Details */}
                            <div className="px-4 pb-4">
                              <div className="space-y-2">
                                {/* Location */}
                                <div className="flex items-center gap-1 text-sm text-gray-500" data-location={recommendation.location}>
                                  <MapPin className="w-4 h-4" />
                                  <span>{recommendation.location}</span>
                                </div>
                                
                                {/* Time and Opening Hours */}
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                  <span className="text-xs">Estimated Time:</span>
                                    <span>{recommendation.estimated_time}</span>
                                  </div>
                                  
                                  {/* Opening Hours */}
                                  {recommendation.opening_hours && recommendation.opening_hours.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">Opening Hours:</span>
                                      <span className="text-xs">
                                        {recommendation.opening_hours[0]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Contact Info */}
                                <div className="flex items-center gap-4 text-sm">
                                  {/* Learn More Link */}
                                  <div className="flex items-center gap-1">
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                    <a 
                                      href={recommendation.relevant_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      Learn More
                                    </a>
                                  </div>
                                  
                                  {/* Phone Number */}
                                  {recommendation.phone_number && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-4 h-4 text-gray-400" />
                                      <a 
                                        href={`tel:${recommendation.phone_number}`}
                                        className="text-green-600 hover:text-green-800 hover:underline"
                                      >
                                        {recommendation.phone_number}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Accordion for Additional Details */}
                              {(recommendation.best_for || recommendation.timing_advice || recommendation.group_suitability || recommendation.practical_tips) && (
                                <div className="mt-4 border-t pt-3">
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedRecommendations);
                                      if (newExpanded.has(recommendation.id)) {
                                        newExpanded.delete(recommendation.id);
                                      } else {
                                        newExpanded.add(recommendation.id);
                                      }
                                      setExpandedRecommendations(newExpanded);
                                    }}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer w-full text-left"
                                  >
                                    <span className="font-medium">Additional Details</span>
                                    <span className={`ml-auto transition-transform ${expandedRecommendations.has(recommendation.id) ? 'rotate-180' : 'rotate-0'}`}>
                                      ▼
                                    </span>
                                  </button>
                                  
                                  {expandedRecommendations.has(recommendation.id) && (
                                    <div className="mt-3 space-y-3">
                                      {/* Best For */}
                                      {recommendation.best_for && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2">
                                            <span className="text-green-500 text-sm">🎯</span>
                                            <p className="text-green-800 text-sm font-medium">Best for:</p>
                                          </div>
                                          <p className="text-green-700 text-sm mt-1">{recommendation.best_for}</p>
                                        </div>
                                      )}
                                      
                                      {/* Timing Advice */}
                                      {recommendation.timing_advice && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2">
                                            <span className="text-amber-500 text-sm">⏰</span>
                                            <p className="text-amber-800 text-sm font-medium">Timing advice:</p>
                                          </div>
                                          <p className="text-amber-700 text-sm mt-1">{recommendation.timing_advice}</p>
                                        </div>
                                      )}
                                      
                                      {/* Group Suitability */}
                                      {recommendation.group_suitability && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2">
                                            <span className="text-purple-500 text-sm">👥</span>
                                            <p className="text-purple-800 text-sm font-medium">Group suitability:</p>
                                          </div>
                                          <p className="text-purple-700 text-sm mt-1">{recommendation.group_suitability}</p>
                                        </div>
                                      )}
                                      
                                      {/* Practical Tips */}
                                      {recommendation.practical_tips && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-500 text-sm">💡</span>
                                            <p className="text-gray-800 text-sm font-medium">Practical tips:</p>
                                          </div>
                                          <p className="text-gray-700 text-sm mt-1">{recommendation.practical_tips}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                      {/* Generate More Button */}
                      {!generatingRecommendations && recommendations.length > 0 && (
                        <div className="flex justify-center mt-6">
                          <button
                            onClick={generateMoreRecommendations}
                            disabled={generatingMore}
                            className="cursor-pointer px-6 py-3 bg-[#ff5a58] hover:bg-[#ff4a47] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            {generatingMore ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating More...
                              </>
                            ) : (
                              <>
                                Generate More Recommendations
                              </>
                            )}
                          </button>
                      </div>
                    )}

                    {/* Empty State */}
                    {!generatingRecommendations && recommendations.length === 0 && (
                      <div className="text-center py-12">
                        <h3 className="text-lg font-semibold text-dark mb-2">No Recommendations Yet</h3>
                        <p className="text-gray-500 mb-6">Generate AI-powered recommendations to get started!</p>
                      </div>
                    )}

                  </div>
                )}

                {activeTab === 'expenses' && (
                  <div className="space-y-6">
                    {/* Expense Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[800px]">
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-dark">${expenseSummary.totalExpenses.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">You've Paid</p>
                            <p className="text-2xl font-bold text-dark">${expenseSummary.userPaid.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Your Share</p>
                            <p className="text-2xl font-bold text-dark">${expenseSummary.userShare.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content: Expense History (70%) and Payment Settlement (30%) */}
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Expense History - 70% width on large screens, full width on smaller */}
                      <div className="w-full lg:w-[70%]">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-dark">Expense History</h3>
                            <p className="text-sm text-gray-500">{expenses.length} expenses recorded</p>
                          </div>
                          <button
                            onClick={() => {
                              setShowAddExpenseModal(true);
                            }}
                            type="button"
                            className="cursor-pointer bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            Add Expense
                            <Plus className="w-4 h-4" />

                          </button>
                        </div>
                      </div>

                      <div className="p-6">
                        {expenses.length > 0 ? (
                          <div className="space-y-4">
                            {expenses.map((expense) => {
                              const paidByParticipant = participants.find(p => p.id === expense.paid_by);
                                const addedByParticipant = participants.find(p => p.id === expense.added_by);
                              const splitCount = expense.split_with === 'everyone' 
                                ? participants.length 
                                : (expense.split_with as string[]).length;
                              const shareAmount = expense.amount / splitCount;
                                const canEdit = user && (expense.added_by === user.id || trip?.owner_id === user.id);

                              return (
                                <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow relative">
                                  {/* Dropdown menu - Top right corner */}
                                  {canEdit && (
                                    <div className="absolute top-4 right-4">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-48 p-1" align="end">
                                          <div className="space-y-1">
                                            <button
                                              onClick={() => handleEditExpense(expense)}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                            >
                                              <Edit className="w-4 h-4" />
                                              Edit Expense
                                            </button>
                                            <button
                                              onClick={() => handleDeleteExpense(expense.id)}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Delete Expense
                                            </button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pr-12">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-medium text-dark">{expense.title}</h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          expense.category === 'food' ? 'bg-green-100 text-green-800' :
                                          expense.category === 'transportation' ? 'bg-yellow-100 text-yellow-800' :
                                          expense.category === 'accommodation' ? 'bg-blue-100 text-blue-800' :
                                          expense.category === 'activity' ? 'bg-purple-100 text-purple-800' :
                                          expense.category === 'shopping' ? 'bg-pink-100 text-pink-800' :
                                          'bg-gray-100 text-dark-medium'
                                        }`}>
                                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                                        </span>
                                      </div>
                                      
                                      {expense.description && (
                                        <p className="text-sm text-gray-600 mb-2">{expense.description}</p>
                                      )}
                                      
                                      <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-4 h-4" />
                                          <span>{new Date(expense.expense_date).toLocaleDateString('en-US', { 
                                            month: 'long', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                          })}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <Avatar 
                                            name={paidByParticipant?.name || 'Unknown'} 
                                            imageUrl={paidByParticipant?.avatar_url}
                                            size="sm"
                                            onClick={() => paidByParticipant && setSelectedUserId(paidByParticipant.id)}
                                          />
                                          <span>Paid by {paidByParticipant?.name || 'Unknown'}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          <span>Split with: {expense.split_with === 'everyone' ? 'Everyone' : 'Selected'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Total Price - Far right, vertically centered */}
                                    <div className="text-right">
                                      <div className="text-2xl font-bold text-dark">
                                        ${expense.amount.toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <DollarSign className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-dark mb-2">No expenses yet</h3>
                            <p className="text-form mb-6">Start tracking your trip expenses to keep everyone in the loop.</p>
                            <button
                              onClick={() => {
                              setShowAddExpenseModal(true);
                            }}
                            type="button"
                              className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                              Add First Expense
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                      </div>

                      {/* Payment Settlement - 30% width on large screens, full width on smaller */}
                      <div className="w-full lg:w-[30%]">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                          <div className="p-6 border-b border-gray-100">
                            <div>
                              <h3 className="text-lg font-semibold text-dark">Payment Settlement</h3>
                              <p className="text-sm text-gray-500">Who should pay how much to whom</p>
                            </div>
                          </div>
                          <div className="p-6">
                            {(() => {
                              const calculatedSettlements = calculateSettlements();
                              const unpaidSettlements = calculatedSettlements.filter(calculatedSettlement => {
                                return !settlements.some(settlement => 
                                  settlement.from_user_id === calculatedSettlement.fromId &&
                                  settlement.to_user_id === calculatedSettlement.toId &&
                                  Math.abs(settlement.amount - calculatedSettlement.amount) < 0.01
                                );
                              });

                              if (unpaidSettlements.length === 0) {
                                return (
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">All Settled!</h4>
                                    <p className="text-gray-500">Everyone's expenses are balanced. No payments needed.</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  {unpaidSettlements.map((settlement, index) => {
                                    const fromParticipant = participants.find(p => p.id === settlement.fromId);
                                    const toParticipant = participants.find(p => p.id === settlement.toId);
                                    
                                    return (
                                      <div
                                        key={index}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                              <DollarSign className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-2">
                                                <Avatar
                                                  name={fromParticipant?.name || 'Unknown'}
                                                  onClick={() => fromParticipant && setSelectedUserId(fromParticipant.id)}
                                                  imageUrl={fromParticipant?.avatar_url}
                                                  size="sm"
                                                  showTooltip={true}
                                                />
                                              </div>
                                              <span className="text-gray-400">→</span>
                                              <div className="flex items-center gap-2">
                                                <Avatar
                                                  name={toParticipant?.name || 'Unknown'}
                                                  onClick={() => toParticipant && setSelectedUserId(toParticipant.id)}
                                                  imageUrl={toParticipant?.avatar_url}
                                                  size="sm"
                                                  showTooltip={true}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-lg font-semibold text-gray-900">
                                              ${settlement.amount.toFixed(2)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                  {activeTab === 'gallery' && trip && user && (
                    <Gallery
                      tripId={trip.id}
                      userId={user.id}
                      numberOfDays={Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                      participants={participants}
                    />
                  )}

                  {activeTab === 'recentactivities' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                                      <div>
                          <h2 className="text-2xl font-bold text-dark">Recent Activities</h2>
                          <p className="text-gray-600 mt-1">Track all important changes and updates in this trip</p>
                                      </div>
                        {trip && user && trip.owner_id === user.id && (
                          <button
                            onClick={async () => {
                              if (!trip || !user) return;
                              
                              const confirmed = window.confirm(
                                'Are you sure you want to clear all activity history? This action cannot be undone.'
                              );
                              
                              if (confirmed) {
                                const success = await clearActivityHistory(trip.id, user.id);
                                if (success) {
                                  setActivityLogs([]);
                                  toast.success('Activity history cleared');
                                } else {
                                  toast.error('Failed to clear activity history');
                                }
                              }
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Clear History
                          </button>
                        )}
                        </div>
                        

                      {/* Activity Logs */}
                      {loadingActivityLogs ? (
                        <div className="text-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Loading activity history...</p>
                        </div>
                      ) : activityLogs.length > 0 ? (
                              <div className="space-y-4">
                          {activityLogs.map((log) => (
                            <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-start gap-3">
                                <Avatar 
                                  name={log.user.name}
                                  onClick={() => setSelectedUserId(log.user_id)} 
                                  imageUrl={participants.find(p => p.id === log.user_id)?.avatar_url}
                                  size="md"
                                  className="flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-dark">{log.user.name}</span>
                                    <span className="text-sm text-gray-500">
                                      {new Date(log.created_at).toLocaleString()}
                                            </span>
                                          </div>
                                  <p className="text-gray-700 mb-1">{log.title}</p>
                                  {log.description && (
                                    <p className="text-sm text-gray-600">{log.description}</p>
                                  )}
                              </div>
                              </div>
                            </div>
                          ))}
                          </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Activity className="w-8 h-8 text-gray-400" />
                        </div>
                          <h3 className="text-lg font-medium text-dark mb-2">No activities yet</h3>
                          <p className="text-gray-600">Activity history will appear here as you and your collaborators make changes to the trip.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Modals */}
        <AddActivityModal
          open={showAddActivityModal}
          onClose={() => setShowAddActivityModal(false)}
          tripId={trip?.id || ''}
          dayNumber={activeDay}
          onActivityAdded={handleActivityAdded}
        />

        {showUpdateInterestsModal && trip && (
        <UpdateInterestsModal
          open={showUpdateInterestsModal}
          onClose={() => setShowUpdateInterestsModal(false)}
          tripId={trip.id}
            currentInterests={trip.interests}
          onInterestsUpdated={handleInterestsUpdated}
        />
        )}

        {showEditActivityModal && selectedActivity && (
          <EditActivityModal
            open={showEditActivityModal}
            onClose={() => {
              setShowEditActivityModal(false);
              setSelectedActivity(null);
            }}
            activity={selectedActivity}
            onActivityUpdated={handleActivityUpdated}
          />
        )}

        {showAddExpenseModal && (
          <AddExpenseModal
            open={showAddExpenseModal}
            onClose={() => setShowAddExpenseModal(false)}
            tripId={params.id as string}
            participants={participants}
            onExpenseAdded={handleExpenseAdded}
          />
        )}

        {showEditExpenseModal && selectedExpense && (
          <EditExpenseModal
            open={showEditExpenseModal}
            onClose={() => {
              setShowEditExpenseModal(false);
              setSelectedExpense(null);
            }}
            expense={selectedExpense}
            participants={participants}
            onExpenseUpdated={handleExpenseUpdated}
          />
        )}

        {showAddIdeaModal && (
          <AddIdeaModal
            open={showAddIdeaModal}
            onClose={() => setShowAddIdeaModal(false)}
            tripId={params.id as string}
            onIdeaAdded={handleIdeaAdded}
          />
        )}

        {showEditIdeaModal && selectedIdea && (
          <EditIdeaModal
            open={showEditIdeaModal}
            onClose={() => {
              setShowEditIdeaModal(false);
              setSelectedIdea(null);
            }}
            idea={selectedIdea}
            onIdeaUpdated={handleIdeaUpdated}
          />
        )}

        {showMoveToItineraryModal && selectedIdea && (
          <MoveToItineraryModal
            open={showMoveToItineraryModal}
            onClose={() => {
              setShowMoveToItineraryModal(false);
              setSelectedIdea(null);
            }}
            idea={selectedIdea}
            tripDays={getTripDays()}
            onActivityAdded={handleActivityAdded}
            onIdeaRemoved={handleIdeaAdded}
          />
        )}

        {showEditTripModal && trip && (
          <EditTripModal
            open={showEditTripModal}
            onClose={() => setShowEditTripModal(false)}
            trip={trip}
            onTripUpdated={handleTripUpdated}
          />
        )}

        {showShareTripGuideModal && trip && (
          <ShareTripGuideModal
            open={showShareTripGuideModal}
            onClose={() => setShowShareTripGuideModal(false)}
            tripId={trip.id}
            currentCaption={trip.share_caption || null}
            isCurrentlyShared={trip.shared_to_social || false}
            onShared={() => {
              handleTripUpdated('share');
            }}
          />
        )}

        {showInviteCollaboratorsModal && trip && trip.id && (
          <InviteCollaboratorsModal
            open={showInviteCollaboratorsModal}
            onClose={() => setShowInviteCollaboratorsModal(false)}
            tripId={trip.id}
            tripTitle={trip.title}
            onInvitesSent={handleInvitesSent}
            existingParticipants={participants.map(p => ({
              id: p.id,
              email: p.email || '',
              name: p.name
            }))}
          />
        )}


        {showConfirmationDialog && confirmationConfig && (
          <ConfirmationDialog
            open={showConfirmationDialog}
            onClose={() => {
              // Reset loading state when dialog is closed
              setConfirmationConfig(prev => prev ? { ...prev, isLoading: false } : null);
              setShowConfirmationDialog(false);
              setConfirmationConfig(null);
            }}
            onOpenChange={(open) => {
              // Ensure dialog state is properly synced
              if (!open) {
                setConfirmationConfig(prev => prev ? { ...prev, isLoading: false } : null);
                setShowConfirmationDialog(false);
                setConfirmationConfig(null);
              }
            }}
            onConfirm={confirmationConfig.onConfirm}
            title={confirmationConfig.title}
            description={confirmationConfig.description}
            isLoading={confirmationConfig.isLoading}
            variant={confirmationConfig.variant || 'danger'}
            confirmText={confirmationConfig.confirmText}
            cancelText={confirmationConfig.cancelText}
          />
        )}

    {/* AI Chat Sidebar */}
    {showAIChatSidebar && selectedDestination && (
      <div className="fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-[9998] flex flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              Ask AI about "{selectedDestination}"
            </h3>
      </div>
          <button
            onClick={closeAIChatSidebar}
            className="cursor-pointer p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {aiMessages.map((message, index) => {
            // Strip simple markdown bold markers for cleaner display in the chat bubble
            const displayContent = message.content.replace(/\*\*(.*?)\*\*/g, '$1');
            return (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-[#0B486B] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {displayContent}
                </div>
              </div>
            );
          })}
              
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          )}

          {attractionsLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-gray-600">Finding nearby attractions...</span>
              </div>
            </div>
          )}

          {/* Nearby Attractions */}
          {nearbyAttractions.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Nearby Attractions ({nearbyAttractions.length})
              </div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => fetchNearbyAttractions()}
                  disabled={attractionsLoading}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {attractionsLoading ? 'Refreshing...' : 'Generate more options'}
                </button>
              </div>
              {nearbyAttractions.map((attraction, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">{attraction.name}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {mapAttractionCategoryToActivityType(attraction.category).charAt(0).toUpperCase() + mapAttractionCategoryToActivityType(attraction.category).slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{attraction.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {attraction.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {attraction.location}
                          </span>
                        )}
                        {attraction.distance && (
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {attraction.distance}
                          </span>
                        )}
                        {attraction.rating && (
                          attraction.linkUrl ? (
                            <a
                              href={attraction.linkUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(attraction.name + ' ' + (attraction.location || trip?.destination || ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded transition-colors cursor-pointer"
                              title="View reviews on Google Maps"
                            >
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium text-gray-700">
                                {attraction.rating.toFixed ? attraction.rating.toFixed(1) : attraction.rating}
                              </span>
                              <ExternalLink className="w-3 h-3 text-gray-400 ml-0.5" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {attraction.rating}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => addAttractionToIdeas(attraction)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#0B486B] text-white text-xs rounded-md hover:bg-[#093751] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add to Ideas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nearby Accommodations */}
          {nearbyAccommodations.length > 0 && (
            <div className="space-y-3 mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Nearby Accommodations ({nearbyAccommodations.length})
              </div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => fetchNearbyAccommodations()}
                  disabled={accommodationsLoading}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {accommodationsLoading ? 'Refreshing...' : 'Generate more options'}
                </button>
              </div>
              {nearbyAccommodations.map((item, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Accommodation
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                        )}
                        {item.rating && (
                          item.linkUrl ? (
                            <a
                              href={item.linkUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.location || trip?.destination || ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded transition-colors cursor-pointer"
                              title="View reviews on Google Maps"
                            >
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium text-gray-700">
                                {item.rating.toFixed ? item.rating.toFixed(1) : item.rating}
                              </span>
                              <ExternalLink className="w-3 h-3 text-gray-400 ml-0.5" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {item.rating}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => addAttractionToIdeas(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#0B486B] text-white text-xs rounded-md hover:bg-[#093751] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add to Ideas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="space-y-2">
            {[
                  "What are the best things to do here?",
                  "What's the best time to visit?",
                  "How much time should I spend here?",
                  "What should I know before visiting?",
                  "What are the nearby attractions?",
              "What are the nearby accommodations?",
                  "What are the reviews saying about this place?"
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendAIMessage(question)}
                    disabled={aiLoading}
                    className="w-full text-left p-2 text-sm text-gray-700 hover:bg-white hover:text-gray-900 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* User Profile Dialog */}
      {selectedUserId && (
        <UserProfileDialog
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

    </ProtectedRoute>
  );
}

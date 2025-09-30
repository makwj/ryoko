"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import { 
  Home, 
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
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ExternalLink,
  Tag,
  Archive,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Loader2
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
import Gallery from "@/components/Gallery";
import DestinationImage from "@/components/DestinationImage";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
  created_at: string;
}

interface Activity {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  description: string;
  activity_time: string;
  location: string;
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food';
  note?: string;
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
  split_with: string[] | 'everyone';
  split_amounts?: Record<string, number>;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  name: string;
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
  activity_type: 'transportation' | 'accommodation' | 'activity' | 'food' | 'shopping' | 'nature' | 'history' | 'culture';
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
}

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
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
  const [showTripActionsMenu, setShowTripActionsMenu] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [user, setUser] = useState<any>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');

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
            .select('id, name')
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
        console.log('Current user:', user);
        console.log('Trip data:', tripData);
        console.log('User ID:', user?.id);
        console.log('Trip owner ID:', tripData?.owner_id);
        console.log('Is owner:', user?.id === tripData?.owner_id);
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
  }, [params.id, router]);

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transportation': return 'bg-yellow-100 text-yellow-800';
      case 'accommodation': return 'bg-blue-100 text-blue-800';
      case 'activity': return 'bg-green-100 text-green-800';
      case 'food': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-dark-medium';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transportation': return <Train className="w-4 h-4" />;
      case 'accommodation': return <Pin className="w-4 h-4" />;
      case 'activity': return <MapPin className="w-4 h-4" />;
      case 'food': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActivitiesForDay = (dayNumber: number) => {
    return activities
      .filter(activity => activity.day_number === dayNumber)
      .sort((a, b) => {
        // Sort by time, with activities without time at the end
        if (!a.activity_time && !b.activity_time) return 0;
        if (!a.activity_time) return 1;
        if (!b.activity_time) return -1;
        return a.activity_time.localeCompare(b.activity_time);
      });
  };

  const getActivityCountForDay = (dayNumber: number) => {
    return activities.filter(activity => activity.day_number === dayNumber).length;
  };

  const handleActivityAdded = async () => {
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
  };

  const handleExpenseAdded = async () => {
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
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense deleted successfully!');
      handleExpenseAdded(); // Refresh expenses
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
  };

  const handleIdeaAdded = async () => {
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

  const handleTripUpdated = async () => {
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
        
        console.log('Refreshing participants with IDs:', participantIds);
        
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', participantIds);

        console.log('Profiles query result:', { profilesData, error });

        if (!error) {
          setParticipants(profilesData || []);
          console.log('Participants updated:', profilesData);
        } else {
          console.error('Error fetching profiles:', error);
        }
      } catch (error) {
        console.error('Error refreshing participants:', error);
      }
    }
  };

  const handleInvitesSent = async () => {
    // Refresh participants data after invitations are sent
    await refreshParticipants();
  };

  const handleArchiveTrip = async () => {
    console.log('handleArchiveTrip called');
    if (!confirm('Are you sure you want to archive this trip? It will be hidden from your active trips.')) {
      return;
    }

    try {
      console.log('Archiving trip:', trip?.id);
      const { error } = await supabase
        .from('trips')
        .update({ archived: true })
        .eq('id', trip?.id);

      if (error) throw error;

      toast.success('Trip archived successfully!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error('Archive error:', errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCompleteTrip = async () => {
    console.log('handleCompleteTrip called');
    if (!confirm('Are you sure you want to mark this trip as completed?')) {
      return;
    }

    try {
      console.log('Completing trip:', trip?.id);
      const { error } = await supabase
        .from('trips')
        .update({ completed: true })
        .eq('id', trip?.id);

      if (error) throw error;

      toast.success('Trip marked as completed!');
      handleTripUpdated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error('Complete error:', errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteTrip = async () => {
    console.log('handleDeleteTrip called');
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone and will delete all activities, expenses, and ideas.')) {
      return;
    }

    try {
      console.log('Deleting trip:', trip?.id);
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', trip?.id);

      if (error) throw error;

      toast.success('Trip deleted successfully!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error('Delete error:', errorMessage);
      toast.error(errorMessage);
    }
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
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('idea_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted!');
      handleCommentsUpdated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
  };

  const handleEditIdea = (idea: Idea) => {
    setSelectedIdea(idea);
    setShowEditIdeaModal(true);
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', ideaId);

      if (error) throw error;

      toast.success('Idea deleted successfully!');
      handleIdeaAdded(); // Refresh ideas
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
  };

  const calculateExpenseSummary = (expensesData: Expense[]) => {
    if (!user || !participants.length) return;

    const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
    const userPaid = expensesData
      .filter(expense => expense.paid_by === user.id)
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    const userShare = expensesData.reduce((sum, expense) => {
      const splitCount = expense.split_with === 'everyone' 
        ? participants.length 
        : (expense.split_with as string[]).length;
      
      // Only add to user's share if they are included in the split
      const isUserInSplit = expense.split_with === 'everyone' || 
        (expense.split_with as string[]).includes(user.id);
      
      return isUserInSplit ? sum + (expense.amount / splitCount) : sum;
    }, 0);

    setExpenseSummary({
      totalExpenses,
      userPaid,
      userShare
    });
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

  // Function to generate AI recommendations
  const generateRecommendations = async () => {
    if (!trip) return;

    setGeneratingRecommendations(true);

    try {
      const tripData = {
        destination: trip.destination,
        interests: trip.interests || [],
        numberOfDays: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        numberOfParticipants: participants.length,
        startDate: trip.start_date,
        additionalInfo: additionalInfo.trim() || undefined
      };

      const response = await fetch('/api/enhanced-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripData }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      toast.success('Recommendations generated successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to generate recommendations: ${errorMessage}`);
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  // Function to move recommendation to ideas
  const moveRecommendationToIdeas = async (recommendation: TripRecommendation) => {
    try {
      const { error } = await supabase
        .from('ideas')
        .insert([
          {
            trip_id: params.id,
            title: recommendation.title,
            description: recommendation.description,
            location: recommendation.location,
            link_url: recommendation.relevant_link,
            link_title: recommendation.title,
            link_description: recommendation.description,
            link_image: recommendation.image_url,
            tags: [recommendation.activity_type],
            added_by: user?.id
          }
        ]);

      if (error) throw error;

      // Refresh ideas data
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .eq('trip_id', params.id)
        .order('created_at', { ascending: false });

      if (!ideasError) {
        setIdeas(ideasData || []);
      }

      // Remove from recommendations
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendation.id));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(errorMessage);
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
      const splitCount = expense.split_with === 'everyone' 
        ? participants.length 
        : (expense.split_with as string[]).length;
      
      const shareAmount = expense.amount / splitCount;
      
      // Add to paid by person
      balances[expense.paid_by] += expense.amount;
      
      // Subtract from all participants
      if (expense.split_with === 'everyone') {
        participants.forEach(participant => {
          balances[participant.id] -= shareAmount;
        });
      } else {
        (expense.split_with as string[]).forEach(participantId => {
          balances[participantId] -= shareAmount;
        });
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

  const handleInterestsUpdated = (interests: string[]) => {
    if (trip) {
      setTrip({ ...trip, interests });
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowEditActivityModal(true);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      // First, get the activity to find its attachments
      const { data: activityData } = await supabase
        .from('activities')
        .select('attachments')
        .eq('id', activityId)
        .single();

      // Delete files from storage if they exist
      if (activityData?.attachments && activityData.attachments.length > 0) {
        await deleteActivityFiles(activityData.attachments);
      }

      // Delete the activity from database
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      toast.success('Activity deleted successfully!');
      handleActivityAdded(); // Refresh activities
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    }
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
              className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-2 rounded-lg"
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
        {/* Header */}
        <motion.header
          className="fixed top-4 inset-x-0 z-30 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-[1400px] px-3">
            <motion.div
              className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md shadow-lg shadow-black/5 flex items-center justify-between"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Image src="/assets/ryokoicon.png" alt="Ryoko logo" width={32} height={32} />
              </motion.div>
              <motion.nav
                className="flex items-center gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button 
                  className="p-2 text-[#ff5a58] bg-gray-100 rounded-full transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/social')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => router.push('/bookmark')}
                  className="p-2 text-gray-400 hover:text-[#ff5a58] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              </motion.nav>
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="w-8 h-8 bg-[#ff5a58] rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">U</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.header>

        {/* Back Button */}
        <div className="pt-20 pb-4">
          <div className="max-w-[1400px] mx-auto px-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm"
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
              {/* Trip Actions Menu - Debug version */}
              {(user?.id === trip?.owner_id || true) && (
                <div className="absolute top-4 right-4 z-10" data-trip-menu-trigger>
                  <button
                    onClick={() => {
                      console.log('Trip actions menu clicked');
                      console.log('Current showTripActionsMenu:', showTripActionsMenu);
                      setShowTripActionsMenu(!showTripActionsMenu);
                    }}
                    className="p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                  
                  {showTripActionsMenu && (
                    <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] z-50" data-trip-menu>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit trip clicked');
                          setShowEditTripModal(true);
                          setShowTripActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Trip Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Complete trip clicked');
                          handleCompleteTrip();
                          setShowTripActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Completed
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Archive trip clicked');
                          handleArchiveTrip();
                          setShowTripActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4" />
                        Archive Trip
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Delete trip clicked');
                          handleDeleteTrip();
                          setShowTripActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Delete Trip
                      </button>
                    </div>
                  )}
                </div>
              )}

              <DestinationImage 
                destination={trip.destination || ''}
                className="h-48"
                fallbackClassName="bg-gradient-to-br from-green-400 to-green-600"
              >
                <div className="absolute bottom-4 left-4 text-white">
                  <h1 className="text-2xl font-bold mb-2 drop-shadow-lg">{trip.title}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <Pin className="w-4 h-4 drop-shadow-sm" />
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
              </DestinationImage>
            </div>

            {/* Group Interests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-dark">Group Interests</h3>
                <button 
                  onClick={() => setShowUpdateInterestsModal(true)}
                  className="text-sm text-gray-500 hover:text-[#ff5a58] transition-colors font-medium"
                >
                  Update Interests
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {trip.interests && trip.interests.length > 0 ? (
                  trip.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-[#ff5a58]/10 to-[#ff5a58]/20 text-[#ff5a58] rounded-full text-sm font-medium border border-[#ff5a58]/20"
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
                    console.log('Opening invite modal for trip:', trip?.id, 'title:', trip?.title);
                    setShowInviteCollaboratorsModal(true);
                  }}
                  className="text-sm text-gray-500 hover:text-[#ff5a58] transition-colors font-medium"
                >
                  Invite Participants
                </button>
              </div>
              <div className="space-y-3">
                {/* Show trip owner as creator */}
                {(() => {
                  const tripOwner = participants.find(p => p.id === trip.owner_id);
                  console.log('Trip owner lookup:', { 
                    tripOwnerId: trip.owner_id, 
                    participants: participants, 
                    tripOwner: tripOwner 
                  });
                  
                  // If no trip owner found in participants, show a fallback
                  if (!tripOwner && participants.length === 0) {
                    return (
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xs text-white font-medium">L</span>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">Loading...</span>
                        <span className="px-2 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-800 text-xs rounded-full font-medium border border-red-200">Creator</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs text-white font-medium">
                          {tripOwner?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700 font-medium">
                        {tripOwner?.name || 'Trip Owner'}
                      </span>
                      <span className="px-2 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-800 text-xs rounded-full font-medium border border-red-200">Creator</span>
                    </div>
                  );
                })()}
                {trip.collaborators && trip.collaborators.length > 0 ? (
                  trip.collaborators.map((collaboratorId, index) => {
                    const collaborator = participants.find(p => p.id === collaboratorId);
                    console.log('Collaborator lookup:', { 
                      collaboratorId, 
                      participants: participants, 
                      collaborator: collaborator 
                    });
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                          index === 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 
                          index === 1 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                          <span className="text-xs text-white font-medium">
                            {collaborator?.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          {collaborator?.name || 'Unknown User'}
                        </span>
                        <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs rounded-full font-medium border border-blue-200">Collaborator</span>
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
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {['Itinerary', 'Idea Board', 'Recommendations', 'Expenses', 'Gallery'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase().replace(' ', ''))}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.toLowerCase().replace(' ', '')
                    ? 'bg-[#ff5a58] text-white'
                    : 'text-gray-600 hover:text-dark'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-4 pb-8">
          <div className={`grid grid-cols-1 gap-6 ${activeTab === 'itinerary' ? 'lg:grid-cols-4' : 'lg:grid-cols-1'}`}>
            {/* Left Sidebar - Days (only visible on itinerary tab) */}
            {activeTab === 'itinerary' && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-dark mb-2">Days</h3>
                  <p className="text-sm text-gray-500 mb-4">Select a day to view itinerary</p>
                  <div className="space-y-2">
                    {days.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveDay(day.day)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          activeDay === day.day
                            ? 'bg-[#ff5a58] text-white'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">Day {day.day}</div>
                            <div className="text-sm opacity-75">
                              {formatDate(day.date.toISOString())}
                            </div>
                          </div>
                          <div className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {day.activities}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={activeTab === 'itinerary' ? 'lg:col-span-3' : 'lg:col-span-1'}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'itinerary' && (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <h2 className="text-xl font-bold text-dark">
                          Day {activeDay} {currentDay && formatDate(currentDay.date.toISOString())} {currentDay && getDayName(currentDay.date.toISOString())}
                        </h2>
                      </div>
                      <button 
                        onClick={() => setShowAddActivityModal(true)}
                        className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Activities
                      </button>
                    </div>

                    <div className="space-y-4">
                      {getActivitiesForDay(activeDay).length > 0 ? (
                        getActivitiesForDay(activeDay).map((activity) => (
                          <motion.div
                            key={activity.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(activity.activity_type)} whitespace-nowrap`}>
                                  {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                </span>
                                <h3 className="font-semibold text-dark truncate">{activity.title}</h3>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleEditActivity(activity)}
                                  className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                  title="Edit activity"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteActivity(activity.id)}
                                  className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                                  title="Delete activity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {activity.description && (
                              <p className="text-gray-600 text-sm mb-3">{activity.description}</p>
                            )}

                            <div className="flex items-center gap-4 mb-3">
                              {activity.activity_time && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  {activity.activity_time}
                                </div>
                              )}
                              {activity.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  {getTypeIcon(activity.activity_type)}
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
                                    } catch (e) {
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
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-dark mb-2">No activities yet</h3>
                          <p className="text-form mb-6">Add your first activity to start planning your day!</p>
                          <button 
                            onClick={() => setShowAddActivityModal(true)}
                            className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                          >
                            Add Activity
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'ideaboard' && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-dark">Collaborate on Trip Ideas and Vote on Activities</h2>
                        <p className="text-gray-600 mt-1">Share inspiration and decide what to do together</p>
                      </div>
                      <button
                        onClick={() => setShowAddIdeaModal(true)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add an Idea
                      </button>
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === 'all'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      {['food', 'transportation', 'accommodation', 'activity', 'shopping', 'nature', 'history', 'culture', 'other'].map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                            selectedCategory === category
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
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
                            <div key={idea.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                              <div className="flex">
                                {/* Image */}
                                <div className="w-48 h-32 bg-gray-100 flex-shrink-0">
                                  {idea.link_image ? (
                                    <img 
                                      src={idea.link_image} 
                                      alt={idea.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <MapPin className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-dark mb-1">{idea.title}</h3>
                                      
                                      {/* Tags */}
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {idea.tags.map((tag) => (
                                          <span key={tag} className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            tag === 'food' ? 'bg-green-100 text-green-800' :
                                            tag === 'transportation' ? 'bg-yellow-100 text-yellow-800' :
                                            tag === 'accommodation' ? 'bg-blue-100 text-blue-800' :
                                            tag === 'activity' ? 'bg-purple-100 text-purple-800' :
                                            tag === 'shopping' ? 'bg-pink-100 text-pink-800' :
                                            tag === 'nature' ? 'bg-emerald-100 text-emerald-800' :
                                            tag === 'history' ? 'bg-amber-100 text-amber-800' :
                                            tag === 'culture' ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-gray-100 text-dark-medium'
                                          }`}>
                                            {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                          </span>
                                        ))}
                                        {idea.link_url && (
                                          <ExternalLink className="w-4 h-4 text-gray-400" />
                                        )}
                                      </div>

                                      {/* Description */}
                                      {idea.description && (
                                        <p className="text-sm text-gray-600 mb-3">{idea.description}</p>
                                      )}

                                      {/* Location */}
                                      {idea.location && (
                                        <div className="flex items-center gap-1 mb-3">
                                          <MapPin className="w-4 h-4 text-gray-400" />
                                          <span className="text-sm text-gray-600">{idea.location}</span>
                                        </div>
                                      )}

                                      {/* Link Preview */}
                                      {idea.link_url && (
                                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                          <a 
                                            href={idea.link_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            {idea.link_title || idea.link_url}
                                          </a>
                                          {idea.link_description && (
                                            <p className="text-xs text-gray-500 mt-1">{idea.link_description}</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Voting */}
                                      <div className="flex items-center gap-4 mb-3">
                                        <button
                                          onClick={() => handleVoteIdea(idea.id, 'upvote')}
                                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                                            userVote?.vote_type === 'upvote'
                                              ? 'bg-red-100 text-red-600'
                                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                          }`}
                                        >
                                          <ThumbsUp className="w-4 h-4" />
                                          <span className="text-sm font-medium">{idea.upvotes}</span>
                                        </button>
                                        <button
                                          onClick={() => handleVoteIdea(idea.id, 'downvote')}
                                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                                            userVote?.vote_type === 'downvote'
                                              ? 'bg-red-100 text-red-600'
                                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                          }`}
                                        >
                                          <ThumbsDown className="w-4 h-4" />
                                          <span className="text-sm font-medium">{idea.downvotes}</span>
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

                                      {/* Added By */}
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>Added By:</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                              {addedByParticipant?.name?.charAt(0) || '?'}
                                            </span>
                                          </div>
                                          <span>{addedByParticipant?.name || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 ml-4">
                                      {/* Edit and Delete buttons */}
                                      <button
                                        onClick={() => handleEditIdea(idea)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit idea"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteIdea(idea.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete idea"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                      
                                      {/* Move to Itinerary Button */}
                                      <button
                                        onClick={() => handleMoveToItinerary(idea)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                      >
                                        Move to Itinerary
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Inline Comments Section */}
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
                                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-medium text-gray-600">
                                                  {commenter?.name?.charAt(0) || '?'}
                                                </span>
                                              </div>
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
                                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-medium text-gray-600">
                                          {user?.email?.charAt(0) || '?'}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <textarea
                                          value={newCommentText[idea.id] || ''}
                                          onChange={(e) => setNewCommentText(prev => ({ ...prev, [idea.id]: e.target.value }))}
                                          placeholder="Write a comment..."
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                                          rows={2}
                                        />
                                      </div>
                                      <button
                                        onClick={() => handleAddComment(idea.id)}
                                        disabled={!newCommentText[idea.id]?.trim()}
                                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Empty State */}
                    {ideas.filter(idea => selectedCategory === 'all' || idea.tags.includes(selectedCategory)).length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Bookmark className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-dark mb-2">No ideas yet</h3>
                        <p className="text-form mb-6">
                          {selectedCategory === 'all' 
                            ? 'Start adding ideas to collaborate on your trip!'
                            : `No ${selectedCategory} ideas yet. Add some inspiration!`
                          }
                        </p>
                        <button
                          onClick={() => setShowAddIdeaModal(true)}
                          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Add Your First Idea
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'recommendations' && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-dark">AI Trip Recommendations</h2>
                        <p className="text-gray-600 mt-1">Get personalized suggestions based on your trip details</p>
                      </div>
                      <button
                        onClick={generateRecommendations}
                        disabled={generatingRecommendations}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                      >
                        {generatingRecommendations ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate Recommendations
                          </>
                        )}
                      </button>
                    </div>

                    {/* Additional Information Input */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-dark mb-2">Additional Preferences (Optional)</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Tell us more about what you're looking for to get more personalized recommendations. 
                          For example: "I prefer budget-friendly options", "I love street food", "I want to avoid crowded places", etc.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <textarea
                          value={additionalInfo}
                          onChange={(e) => setAdditionalInfo(e.target.value)}
                          placeholder="e.g., I prefer budget-friendly options, love street food, want to avoid crowded places..."
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          rows={3}
                          disabled={generatingRecommendations}
                        />
                        <div className="flex flex-col justify-end">
                          <button
                            onClick={() => setAdditionalInfo('')}
                            disabled={generatingRecommendations || !additionalInfo.trim()}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Loading State */}
                    {generatingRecommendations && (
                  <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
                        <p className="text-gray-600">Generating personalized recommendations...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                    </div>
                    )}

                    {/* Recommendations Grid */}
                    {!generatingRecommendations && recommendations.length > 0 && (
                      <div className="grid gap-6">
                        {recommendations.map((recommendation) => (
                          <div key={recommendation.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                            <div className="flex">
                              {/* Image */}
                              <div className="w-48 h-32 bg-gray-100 flex-shrink-0">
                                {recommendation.image_url ? (
                                  <img 
                                    src={recommendation.image_url} 
                                    alt={recommendation.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-4xl">
                                      {recommendation.activity_type === 'transportation' ? '🚗' :
                                       recommendation.activity_type === 'accommodation' ? '🏨' :
                                       recommendation.activity_type === 'activity' ? '🎯' :
                                       recommendation.activity_type === 'food' ? '🍽️' :
                                       recommendation.activity_type === 'shopping' ? '🛍️' :
                                       recommendation.activity_type === 'nature' ? '🌿' :
                                       recommendation.activity_type === 'history' ? '🏛️' :
                                       recommendation.activity_type === 'culture' ? '🎭' : '📍'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-dark mb-1">{recommendation.title}</h3>
                                    
                                    {/* Activity Type Badge and Rating */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        recommendation.activity_type === 'transportation' ? 'bg-blue-100 text-blue-800' :
                                        recommendation.activity_type === 'accommodation' ? 'bg-purple-100 text-purple-800' :
                                        recommendation.activity_type === 'activity' ? 'bg-green-100 text-green-800' :
                                        recommendation.activity_type === 'food' ? 'bg-orange-100 text-orange-800' :
                                        recommendation.activity_type === 'shopping' ? 'bg-pink-100 text-pink-800' :
                                        recommendation.activity_type === 'nature' ? 'bg-emerald-100 text-emerald-800' :
                                        recommendation.activity_type === 'history' ? 'bg-amber-100 text-amber-800' :
                                        recommendation.activity_type === 'culture' ? 'bg-indigo-100 text-indigo-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {recommendation.activity_type}
                                      </span>
                                      
                                      {/* Google Places Rating */}
                                      {recommendation.rating && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-yellow-500">⭐</span>
                                          <span className="text-sm font-medium text-gray-700">
                                            {recommendation.rating.toFixed(1)}
                                          </span>
                                          {recommendation.user_ratings_total && (
                                            <span className="text-xs text-gray-500">
                                              ({recommendation.user_ratings_total.toLocaleString()} reviews)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <p className="text-gray-600 text-sm mb-3">{recommendation.description}</p>
                                    
                                    {/* Enhanced Details */}
                                    <div className="space-y-2">
                                      {/* Location */}
                                      <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <MapPin className="w-4 h-4" />
                                        <span>{recommendation.location}</span>
                                      </div>
                                      
                                      {/* Time and Opening Hours */}
                                      <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          <span>{recommendation.estimated_time}</span>
                                        </div>
                                        
                                        {/* Opening Hours */}
                                        {recommendation.opening_hours && recommendation.opening_hours.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs">🕒</span>
                                            <span className="text-xs">
                                              {recommendation.opening_hours[0]}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Contact Info */}
                                      {(recommendation.website || recommendation.phone_number) && (
                                        <div className="flex items-center gap-4 text-sm">
                                          {recommendation.website && (
                                            <a 
                                              href={recommendation.website} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                              Website
                                            </a>
                                          )}
                                          {recommendation.phone_number && (
                                            <a 
                                              href={`tel:${recommendation.phone_number}`}
                                              className="text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                                            >
                                              <span className="text-xs">📞</span>
                                              Call
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Learn More Link */}
                                      <div className="flex items-center gap-1">
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                        <a 
                                          href={recommendation.relevant_link} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                        >
                                          Learn More
                                        </a>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Button */}
                                  <div className="ml-4">
                                    <button
                                      onClick={() => moveRecommendationToIdeas(recommendation)}
                                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Add to Ideas
                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty State */}
                    {!generatingRecommendations && recommendations.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-dark mb-2">No Recommendations Yet</h3>
                        <p className="text-gray-500 mb-6">Generate AI-powered recommendations to get started!</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'expenses' && (
                  <div className="space-y-6">
                    {/* Expense Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-dark">${expenseSummary.totalExpenses.toFixed(2)}</p>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">You've Paid</p>
                            <p className="text-2xl font-bold text-dark">${expenseSummary.userPaid.toFixed(2)}</p>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Your Share</p>
                            <p className="text-2xl font-bold text-dark">${expenseSummary.userShare.toFixed(2)}</p>
                          </div>
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expense History */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-dark">Expense History</h3>
                            <p className="text-sm text-gray-500">{expenses.length} expenses recorded</p>
                          </div>
                          <button
                            onClick={() => setShowAddExpenseModal(true)}
                            className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Expense
                          </button>
                        </div>
                      </div>

                      <div className="p-6">
                        {expenses.length > 0 ? (
                          <div className="space-y-4">
                            {expenses.map((expense) => {
                              const paidByParticipant = participants.find(p => p.id === expense.paid_by);
                              const splitCount = expense.split_with === 'everyone' 
                                ? participants.length 
                                : (expense.split_with as string[]).length;
                              const shareAmount = expense.amount / splitCount;

                              return (
                                <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                  <div className="flex items-start justify-between">
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
                                          <DollarSign className="w-4 h-4" />
                                          <span className="font-medium">${expense.amount.toFixed(2)}</span>
                                          <span>(${shareAmount.toFixed(2)} each)</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-4 h-4" />
                                          <span>{new Date(expense.expense_date).toLocaleDateString('en-US', { 
                                            month: 'long', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                          })}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                              {paidByParticipant?.name?.charAt(0) || '?'}
                                            </span>
                                          </div>
                                          <span>Paid by {paidByParticipant?.name || 'Unknown'}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          <span>Split with: {expense.split_with === 'everyone' ? 'Everyone' : 'Selected'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Edit and Delete buttons */}
                                    <div className="flex items-center gap-2 ml-4">
                                      <button
                                        onClick={() => handleEditExpense(expense)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit expense"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteExpense(expense.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete expense"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
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
                              onClick={() => setShowAddExpenseModal(true)}
                              className="bg-[#ff5a58] hover:bg-[#ff4a47] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                              Add First Expense
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Balance Overview */}
                    {participants.length > 1 && expenses.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-6 border-b border-gray-100">
                          <h3 className="text-lg font-semibold text-dark">Balance Overview</h3>
                          <p className="text-sm text-gray-500">Current balances before settlements</p>
                        </div>
                        
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const balances: Record<string, number> = {};
                              const participantMap: Record<string, string> = {};

                              // Initialize balances
                              participants.forEach(participant => {
                                balances[participant.id] = 0;
                                participantMap[participant.id] = participant.name;
                              });

                              // Calculate balances
                              expenses.forEach(expense => {
                                const splitCount = expense.split_with === 'everyone' 
                                  ? participants.length 
                                  : (expense.split_with as string[]).length;
                                
                                const shareAmount = expense.amount / splitCount;
                                
                                balances[expense.paid_by] += expense.amount;
                                
                                if (expense.split_with === 'everyone') {
                                  participants.forEach(participant => {
                                    balances[participant.id] -= shareAmount;
                                  });
                                } else {
                                  (expense.split_with as string[]).forEach(participantId => {
                                    balances[participantId] -= shareAmount;
                                  });
                                }
                              });

                              return participants.map(participant => {
                                const balance = balances[participant.id];
                                const isPositive = balance > 0.01;
                                const isNegative = balance < -0.01;
                                const isNeutral = !isPositive && !isNegative;

                                return (
                                  <div key={participant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isPositive ? 'bg-green-100' : 
                                        isNegative ? 'bg-red-100' : 
                                        'bg-gray-100'
                                      }`}>
                                        <span className={`text-sm font-medium ${
                                          isPositive ? 'text-green-600' : 
                                          isNegative ? 'text-red-600' : 
                                          'text-gray-600'
                                        }`}>
                                          {participant.name.charAt(0)}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-dark">{participant.name}</p>
                                        <p className="text-sm text-gray-500">
                                          {isPositive ? 'Should receive' : 
                                           isNegative ? 'Should pay' : 
                                           'All settled'}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <span className={`text-lg font-semibold ${
                                      isPositive ? 'text-green-600' : 
                                      isNegative ? 'text-red-600' : 
                                      'text-gray-500'
                                    }`}>
                                      {isNeutral ? 'Settled' : `$${Math.abs(balance).toFixed(2)}`}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Settlement Summary */}
                    {(getUnpaidSettlements().length > 0 || getPaidSettlements().length > 0) && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-6 border-b border-gray-100">
                          <h3 className="text-lg font-semibold text-dark">Settlement Summary</h3>
                          <p className="text-sm text-gray-500">
                            {getUnpaidSettlements().length} unpaid payment{getUnpaidSettlements().length !== 1 ? 's' : ''} • {getPaidSettlements().length} paid settlement{getPaidSettlements().length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        <div className="p-6">
                          {/* Unpaid Settlements */}
                          {getUnpaidSettlements().length > 0 && (
                            <div className="mb-6">
                              <h4 className="text-md font-semibold text-gray-800 mb-4">Unpaid Settlements</h4>
                          <div className="space-y-4">
                                {getUnpaidSettlements().map((settlement, index) => (
                                  <div key={`unpaid-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-red-600">
                                        {settlement.fromName.charAt(0)}
                                      </span>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-green-600">
                                        {settlement.toName.charAt(0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="font-medium text-dark">
                                      <span className="text-red-600">{settlement.fromName}</span> owes{' '}
                                      <span className="text-green-600">{settlement.toName}</span>
                                    </p>
                                    <p className="text-sm text-gray-500">Payment needed</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-semibold text-dark">
                                    ${settlement.amount.toFixed(2)}
                                  </span>
                                  <button 
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                        onClick={() => markSettlementAsPaid(settlement)}
                                  >
                                    Mark as Paid
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                            </div>
                          )}

                          {/* Paid Settlements */}
                          {getPaidSettlements().length > 0 && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-800 mb-4">Paid Settlements</h4>
                              <div className="space-y-4">
                                {getPaidSettlements().map((settlement, index) => {
                                  const fromParticipant = participants.find(p => p.id === settlement.from_user_id);
                                  const toParticipant = participants.find(p => p.id === settlement.to_user_id);
                                  
                                  if (!fromParticipant || !toParticipant) return null;
                                  
                                  return (
                                    <div key={`paid-${settlement.id}`} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-red-600">
                                              {fromParticipant.name.charAt(0)}
                                            </span>
                                          </div>
                                          <span className="text-gray-400">→</span>
                                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-green-600">
                                              {toParticipant.name.charAt(0)}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="font-medium text-dark">
                                            <span className="text-red-600">{fromParticipant.name}</span> paid{' '}
                                            <span className="text-green-600">{toParticipant.name}</span>
                                          </p>
                                          <p className="text-sm text-green-600">✓ Paid on {new Date(settlement.paid_at!).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <span className="text-lg font-semibold text-green-600">
                                          ${settlement.amount.toFixed(2)}
                                        </span>
                                        <button 
                                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                          onClick={() => markSettlementAsUnpaid(settlement.id)}
                                        >
                                          Mark as Unpaid
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Settlement Instructions */}
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-medium text-blue-600">💡</span>
                              </div>
                              <div>
                                <h4 className="font-medium text-blue-900 mb-1">Settlement Tips</h4>
                                <p className="text-sm text-blue-700">
                                  These payments are optimized to minimize the number of transactions needed. 
                                  Each person only needs to make one payment to settle all their debts.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
              </div>
            </div>
          </div>
        </div>

        {/* Add Activity Modal */}
        <AddActivityModal
          open={showAddActivityModal}
          onClose={() => setShowAddActivityModal(false)}
          tripId={trip.id}
          dayNumber={activeDay}
          onActivityAdded={handleActivityAdded}
        />

        {/* Update Interests Modal */}
        <UpdateInterestsModal
          open={showUpdateInterestsModal}
          onClose={() => setShowUpdateInterestsModal(false)}
          tripId={trip.id}
          currentInterests={trip.interests || []}
          onInterestsUpdated={handleInterestsUpdated}
        />

        {/* Edit Activity Modal */}
        {selectedActivity && (
          <EditActivityModal
            open={showEditActivityModal}
            onClose={() => {
              setShowEditActivityModal(false);
              setSelectedActivity(null);
            }}
            activity={selectedActivity!}
            onActivityUpdated={handleActivityAdded}
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
            onExpenseUpdated={handleExpenseAdded}
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
            onIdeaUpdated={handleIdeaAdded}
          />
        )}

        {showMoveToItineraryModal && selectedIdea && (
          <MoveToItineraryModal
            open={showMoveToItineraryModal}
            onClose={() => {
              setShowMoveToItineraryModal(false);
              setSelectedIdea(null);
            }}
            idea={{
              id: selectedIdea.id,
              title: selectedIdea.title,
              description: selectedIdea.description,
              location: selectedIdea.location,
              tags: selectedIdea.tags,
              link_url: selectedIdea.link_url,
              trip_id: selectedIdea.trip_id
            }}
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

        {showInviteCollaboratorsModal && trip && trip.id && (
          <InviteCollaboratorsModal
            open={showInviteCollaboratorsModal}
            onClose={() => setShowInviteCollaboratorsModal(false)}
            tripId={trip.id}
            tripTitle={trip.title}
            onInvitesSent={handleInvitesSent}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

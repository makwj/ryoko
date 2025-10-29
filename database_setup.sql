-- Ryoko Trip Planning App - Complete Database Setup
-- This file contains the complete database schema with all latest features

-- Create profiles table to store additional user data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trips table with all latest features
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  interests TEXT[], -- Array of interest categories
  collaborators TEXT[], -- Array of email addresses
  archived BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  trip_image_url TEXT, -- Custom uploaded image URL for the trip header
  shared_to_social BOOLEAN DEFAULT FALSE, -- Whether trip is shared to social for others to view and copy
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for trips table
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create policies for trips table
CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view shared trips" ON trips
  FOR SELECT USING (shared_to_social = TRUE);

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = owner_id);

-- Create activities table with time periods and link support
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_period TEXT CHECK (time_period IN ('morning', 'afternoon', 'evening')) NOT NULL DEFAULT 'morning',
  location TEXT,
  activity_type TEXT CHECK (activity_type IN ('transportation', 'accommodation', 'activity', 'food', 'shopping', 'entertainment', 'other')) NOT NULL,
  note TEXT,
  link_url TEXT, -- URL for link previews in activity cards
  attachments JSONB, -- Array of objects with {url: string, customName: string}
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT CHECK (category IN ('food', 'transportation', 'accommodation', 'activity', 'shopping', 'other')) NOT NULL,
  paid_by UUID REFERENCES auth.users(id) NOT NULL,
  added_by UUID REFERENCES auth.users(id) NOT NULL, -- Track who created the expense
  split_with JSONB NOT NULL, -- Array of user IDs or "everyone"
  split_amounts JSONB, -- Object with user_id: amount for custom splits
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settlements table
CREATE TABLE settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gallery_images table
CREATE TABLE gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  image_name TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create image_comments table
CREATE TABLE image_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES gallery_images(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ideas table for trip idea board
CREATE TABLE ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  link_url TEXT,
  link_title TEXT,
  link_description TEXT,
  link_image TEXT,
  tags JSONB DEFAULT '["other"]'::jsonb,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create idea_votes table for tracking user votes
CREATE TABLE idea_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

-- Create idea_comments table for comments on ideas
CREATE TABLE idea_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invitations table for trip collaboration invites
CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, invitee_email)
);

-- Create activity_logs table for tracking trip activities
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL, -- Will be validated by RLS policies instead of foreign key
  user_id UUID NOT NULL, -- Will be validated by RLS policies instead of foreign key
  activity_type TEXT NOT NULL, -- 'activity_added', 'activity_edited', 'activity_deleted', 'activity_moved', 'idea_added', 'idea_edited', 'idea_deleted', 'gallery_uploaded', 'expense_settled', etc.
  title TEXT NOT NULL, -- Human-readable title like "Added activity to itinerary"
  description TEXT, -- More detailed description
  metadata JSONB, -- Additional data like activity_id, day_number, file_count, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activities table
CREATE POLICY "Users can view activities for accessible trips" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = activities.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can insert activities for accessible trips" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = activities.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can update activities for accessible trips" ON activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = activities.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can delete activities for accessible trips" ON activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = activities.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

-- Create policies for expenses table
CREATE POLICY "Users can view expenses for accessible trips" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can insert expenses for accessible trips" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can update expenses for accessible trips" ON expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can delete expenses for accessible trips" ON expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

-- Create policies for settlements table
CREATE POLICY "Users can view settlements for accessible trips" ON settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = settlements.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can insert settlements for accessible trips" ON settlements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = settlements.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can update settlements for accessible trips" ON settlements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = settlements.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

CREATE POLICY "Users can delete settlements for accessible trips" ON settlements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = settlements.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

-- Create policies for gallery_images table
CREATE POLICY "Users can view gallery images for their trips" ON gallery_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = gallery_images.trip_id 
      AND (trips.owner_id::text = auth.uid()::text OR auth.email() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can insert gallery images for their trips" ON gallery_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = gallery_images.trip_id 
      AND (trips.owner_id::text = auth.uid()::text OR auth.email() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can update gallery images for their trips" ON gallery_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = gallery_images.trip_id 
      AND (trips.owner_id::text = auth.uid()::text OR auth.email() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can delete gallery images for their trips" ON gallery_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = gallery_images.trip_id 
      AND (trips.owner_id::text = auth.uid()::text OR auth.email() = ANY(trips.collaborators))
    )
  );

-- Create policies for image_comments table
CREATE POLICY "Users can view image comments for their trips" ON image_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gallery_images 
      JOIN trips ON trips.id = gallery_images.trip_id
      WHERE gallery_images.id = image_comments.image_id 
      AND (trips.owner_id::text = auth.uid()::text OR auth.email() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can insert image comments for their trips" ON image_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gallery_images 
      JOIN trips ON trips.id = gallery_images.trip_id
      WHERE gallery_images.id = image_comments.image_id 
      AND (trips.owner_id::text = auth.uid()::text OR auth.email() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can update their own image comments" ON image_comments
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own image comments" ON image_comments
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create policies for ideas table
CREATE POLICY "Users can view ideas for their trips" ON ideas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = ideas.trip_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can insert ideas for their trips" ON ideas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = ideas.trip_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    ) AND added_by = auth.uid()
  );

CREATE POLICY "Users can update ideas for their trips" ON ideas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = ideas.trip_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can delete ideas for their trips" ON ideas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = ideas.trip_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

-- Create policies for idea_votes table
CREATE POLICY "Users can view votes for their trip ideas" ON idea_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ideas 
      JOIN trips ON trips.id = ideas.trip_id
      WHERE ideas.id = idea_votes.idea_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can insert votes for their trip ideas" ON idea_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ideas 
      JOIN trips ON trips.id = ideas.trip_id
      WHERE ideas.id = idea_votes.idea_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can update their own votes" ON idea_votes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes" ON idea_votes
  FOR DELETE USING (user_id = auth.uid());

-- Create policies for idea_comments table
CREATE POLICY "Users can view comments for their trip ideas" ON idea_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ideas 
      JOIN trips ON trips.id = ideas.trip_id
      WHERE ideas.id = idea_comments.idea_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can insert comments for their trip ideas" ON idea_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ideas 
      JOIN trips ON trips.id = ideas.trip_id
      WHERE ideas.id = idea_comments.idea_id 
      AND (trips.owner_id = auth.uid() OR auth.uid() = ANY(trips.collaborators))
    )
  );

CREATE POLICY "Users can update their own comments" ON idea_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON idea_comments
  FOR DELETE USING (user_id = auth.uid());

-- Create policies for invitations table
CREATE POLICY "Users can view invitations sent to them" ON invitations
  FOR SELECT USING (
    invitee_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Trip owners can view invitations for their trips" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can insert invitations for their trips" ON invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can update invitation status" ON invitations
  FOR UPDATE USING (
    invitee_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Trip owners can delete invitations for their trips" ON invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('trip-files', 'trip-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for gallery images
CREATE POLICY "Authenticated users can upload gallery images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Public can view gallery images" ON storage.objects
FOR SELECT USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can delete their gallery images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

-- Create storage policies for trip files
CREATE POLICY "Users can upload files for their trips" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view files for their trips" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update files for their trips" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trip-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete files for their trips" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trip-files' AND
    auth.uid() IS NOT NULL
  );

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
  );

-- Create indexes for better performance
CREATE INDEX idx_activities_trip_day ON activities(trip_id, day_number);
CREATE INDEX idx_activities_order ON activities(trip_id, day_number, order_index);
CREATE INDEX idx_activities_time_period ON activities(trip_id, day_number, time_period, order_index);
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, expense_date);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_ideas_trip ON ideas(trip_id);
CREATE INDEX idx_idea_votes_idea ON idea_votes(idea_id);
CREATE INDEX idx_idea_comments_idea ON idea_comments(idea_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_trip_id ON invitations(trip_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for activity_logs
CREATE INDEX idx_activity_logs_trip_id ON activity_logs(trip_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

-- RLS Policies for activity_logs
-- Users can view activity logs for trips they have access to
CREATE POLICY "Users can view activity logs for accessible trips" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = activity_logs.trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

-- Users can insert activity logs for trips they have access to
CREATE POLICY "Users can insert activity logs for accessible trips" ON activity_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_id 
      AND (trips.owner_id = auth.uid() OR trips.collaborators @> ARRAY[auth.uid()::text])
    )
  );

-- Only trip owners can delete activity logs
CREATE POLICY "Trip owners can delete activity logs" ON activity_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = activity_logs.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

-- Function to log activity (can be called from triggers or application code)
CREATE OR REPLACE FUNCTION log_trip_activity(
  p_trip_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (trip_id, user_id, activity_type, title, description, metadata)
  VALUES (p_trip_id, p_user_id, p_activity_type, p_title, p_description, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




-- =============================
-- Social tables and policies
-- =============================

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  country_code TEXT,
  country_name TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Post images
CREATE TABLE IF NOT EXISTS public.post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  width INT,
  height INT,
  order_index INT NOT NULL DEFAULT 0
);

-- Reactions
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like','dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent via create or replace workaround with exception handling)
DO $$ BEGIN
  -- posts
  CREATE POLICY posts_select ON public.posts FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY posts_insert ON public.posts FOR INSERT WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY posts_update ON public.posts FOR UPDATE USING (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY posts_delete ON public.posts FOR DELETE USING (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_images
DO $$ BEGIN
  CREATE POLICY post_images_select ON public.post_images FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_images_insert ON public.post_images FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_images_delete ON public.post_images FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_reactions
DO $$ BEGIN
  CREATE POLICY post_reactions_select ON public.post_reactions FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_reactions_insert ON public.post_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_reactions_delete ON public.post_reactions FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_comments
DO $$ BEGIN
  CREATE POLICY post_comments_select ON public.post_comments FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_comments_insert ON public.post_comments FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_comments_update ON public.post_comments FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_comments_delete ON public.post_comments FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- post_bookmarks
DO $$ BEGIN
  CREATE POLICY post_bookmarks_select ON public.post_bookmarks FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_bookmarks_insert ON public.post_bookmarks FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_bookmarks_delete ON public.post_bookmarks FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post images
DO $$ BEGIN
  CREATE POLICY post_images_upload ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_images_read ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY post_images_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON public.posts(is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON public.post_images(post_id, order_index);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON public.post_bookmarks(user_id, created_at);


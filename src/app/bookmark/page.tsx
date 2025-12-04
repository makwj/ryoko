"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User } from "@supabase/supabase-js";
import { Home, MapPin, Users, Bookmark } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import PostCard, { PostRecord } from "@/components/PostCard";
import SharedTripCard from "@/components/SharedTripCard";

interface BookmarkedTrip {
  id: string;
  title: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  interests?: string[] | null;
  trip_image_url?: string | null;
  owner_id: string;
  share_caption?: string | null;
  author?: {
    name?: string | null;
    avatar_url?: string | null;
  };
  activity_count?: number;
}

export default function BookmarkPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [trips, setTrips] = useState<BookmarkedTrip[]>([]);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      
      // Load bookmarked posts
      const { data: postsData } = await supabase
        .from('post_bookmarks')
        .select('post:posts(*, author:profiles(name, avatar_url), images:post_images(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      const normalizedPosts = (postsData || []).map((row: any) => {
        const p = row.post;
        return {
          id: p.id,
          author_id: p.author_id,
          content: p.content,
          country_code: p.country_code,
          country_name: p.country_name,
          is_featured: p.is_featured,
          trip_id: p.trip_id,
          created_at: p.created_at,
          author: p.author,
          images: (p.images || []).sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
          bookmarked: true,
        } as PostRecord;
      });
      setPosts(normalizedPosts);

      // Load bookmarked trips
      const { data: tripsData } = await supabase
        .from('trip_bookmarks')
        .select('trip:trips(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tripsData) {
        const tripsWithDetails = await Promise.all(
          tripsData.map(async (row: any) => {
            const trip = row.trip;
            if (!trip || !trip.shared_to_social) return null; // Only show shared trips

            // Get activity count and author
            const [{ count }, { data: authorData }] = await Promise.all([
              supabase
                .from('activities')
                .select('*', { count: 'exact', head: true })
                .eq('trip_id', trip.id),
              supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', trip.owner_id)
                .single(),
            ]);

            return {
              id: trip.id,
              title: trip.title,
              description: trip.description,
              destination: trip.destination,
              start_date: trip.start_date,
              end_date: trip.end_date,
              interests: trip.interests,
              trip_image_url: trip.trip_image_url,
              owner_id: trip.owner_id,
              share_caption: trip.share_caption || null,
              author: authorData || null,
              activity_count: count || 0,
            } as BookmarkedTrip;
          })
        );

        setTrips(tripsWithDetails.filter((t): t is BookmarkedTrip => t !== null));
      }
    };
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Main Content */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-dark">Bookmarks</h1>
            <p className="text-gray-600">Saved posts and trip guides</p>
          </div>

          {posts.length === 0 && trips.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              No bookmarks yet.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Bookmarked Trip Guides */}
              {trips.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#ff5a58]" />
                    Trip Guides ({trips.length})
                  </h2>
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <SharedTripCard key={trip.id} trip={trip} />
                    ))}
                  </div>
                </section>
              )}

              {/* Bookmarked Posts */}
              {posts.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-[#ff5a58]" />
                    Posts ({posts.length})
                  </h2>
                  <div className="space-y-4">
                    {posts.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

      </div>
    </ProtectedRoute>
  );
}

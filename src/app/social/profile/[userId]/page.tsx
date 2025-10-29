"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import PostCard, { PostRecord } from "@/components/PostCard";

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', params.userId).single();
      setProfile(prof);
      const { data: userPosts } = await supabase
        .from('posts')
        .select('*, author:profiles(name, avatar_url), images:post_images(*)')
        .eq('author_id', params.userId)
        .order('created_at', { ascending: false });
      setPosts((userPosts || []).map((row: any) => ({
        id: row.id,
        author_id: row.author_id,
        content: row.content,
        country_code: row.country_code,
        country_name: row.country_name,
        is_featured: row.is_featured,
        trip_id: row.trip_id,
        created_at: row.created_at,
        author: row.author,
        images: (row.images || []).sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      })));

      const { data: participated } = await supabase
        .from('trips')
        .select('*')
        .eq('archived', false)
        .or(`owner_id.eq.${params.userId},collaborators.cs.{${params.userId}}`)
        .order('start_date', { ascending: false });
      setTrips(participated || []);
    };
    load();
  }, [params.userId]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{profile?.name || 'User'}</h1>
          </div>

          <section className="mb-8">
            <h2 className="font-semibold mb-3">Participated Trips</h2>
            {trips.length === 0 ? (
              <div className="text-gray-500">No trips to show.</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {trips.map((t) => (
                  <div key={t.id} className="bg-white border rounded-md p-3">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-gray-500">{t.destination}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold mb-3">Posts</h2>
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}



"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, User } from "lucide-react";
import Link from "next/link";

interface UserSearchResult {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export default function UserSearch({ query, onClose }: { query: string; onClose: () => void }) {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .or(`name.ilike.%${query}%,id.ilike.%${query}%`)
          .limit(10);

        if (!error && data) {
          setResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  if (!query.trim()) return null;

  return (
    <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
      {loading ? (
        <div className="p-4 text-center text-gray-500">Searching...</div>
      ) : results.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No users found</div>
      ) : (
        <div className="py-2">
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/social/profile/${user.id}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || 'User'} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{user.name || 'User'}</div>
                <div className="text-xs text-gray-500">View profile</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// Users types
interface ProfileRow {
  id: string;
  name: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_banned?: boolean | null;
  created_at?: string;
}

// Posts types
type AdminItem = {
  type: 'post' | 'guide';
  id: string;
  author_name: string;
  created_at: string;
  excerpt: string;
  is_featured: boolean;
  total_likes: number;
};

type Tab = 'users' | 'posts';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{ usersTotal: number; usersToday: number; postsTotal: number; postsToday: number; guidesTotal: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('users');

  useEffect(() => {
    const run = async () => {
      try {
        // include auth token so server can verify admin
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';
        const res = await fetch('/api/admin/analytics', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok) setStats(json);
      } finally {
        setStatsLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div>
      <h1 className="text-2xl text-center  text-[#ff5a58] font-bold mt-2 mb-4">Admin Dashboard</h1>
      
      {/* Stats Section */}
      {statsLoading ? (
        <div className="text-gray-500 mb-8">Loading stats...</div>
      ) : stats ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Users" value={stats.usersTotal} />
          <StatCard title="New Signups Today" value={stats.usersToday} />
          <StatCard title="Total Posts" value={stats.postsTotal} />
          <StatCard title="Posts Today" value={stats.postsToday} />
          <StatCard title="Shared Guides" value={stats.guidesTotal} />
        </div>
      ) : (
        <div className="text-red-600 mb-8">Failed to load analytics</div>
      )}

      {/* Management Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-[#ff5a58] font-bold">Manage</h2>
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 font-medium transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'text-[#ff5a58] border-b-2 border-[#ff5a58]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 font-medium transition-colors cursor-pointer ${
                activeTab === 'posts'
                  ? 'text-[#ff5a58] border-b-2 border-[#ff5a58]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Posts
            </button>
          </div>
        </div>

        {activeTab === 'users' ? <UsersTab /> : <PostsTab />}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ProfileRow>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const url = `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setRows(json.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onBanToggle = async (userId: string, isBanned: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, is_banned: !isBanned }) });
      if (res.ok) {
        toast.success(isBanned ? 'User unbanned successfully' : 'User banned successfully');
        load();
      } else {
        toast.error('Failed to update user ban status');
      }
    } catch (error) {
      toast.error('Failed to update user ban status');
    }
  };

  const onRoleToggle = async (userId: string, role: string | null | undefined) => {
    try {
      const next = role === 'admin' ? 'user' : 'admin';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, role: next }) });
      if (res.ok) {
        toast.success(`User role changed to ${next}`);
        load();
      } else {
        toast.error('Failed to update user role');
      }
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = (a[sortKey] ?? '') as any;
      const vb = (b[sortKey] ?? '') as any;
      if (sortKey === 'created_at') {
        const da = va ? new Date(va).getTime() : 0;
        const db = vb ? new Date(vb).getTime() : 0;
        return (da - db) * dir;
      }
      if (typeof va === 'boolean' || typeof vb === 'boolean') {
        return ((va ? 1 : 0) - (vb ? 1 : 0)) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: keyof ProfileRow) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Users</h3>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name..." className="border border-gray-300 rounded-md px-3 py-2 cursor-pointer" />
          <button onClick={load} className="px-3 py-2 rounded-md bg-[#ff5a58] text-white cursor-pointer hover:bg-[#ff4a47] transition-colors">Search</button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('name')}>Name</th>
                <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('email')}>Email</th>
                <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('role')}>Role</th>
                <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('is_banned')}>Banned</th>
                <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>Created</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name || 'User'}</td>
                  <td className="px-4 py-2">{u.email || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{((u.role || 'user').charAt(0).toUpperCase() + (u.role || 'user').slice(1))}</span>
                  </td>
                  <td className="px-4 py-2">{u.is_banned ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => onRoleToggle(u.id, u.role)} className="px-2 py-1 text-xs rounded-md border cursor-pointer hover:bg-gray-100 transition-colors">{u.role === 'admin' ? 'Make User' : 'Make Admin'}</button>
                      <button onClick={() => onBanToggle(u.id, !!u.is_banned)} className={`px-2 py-1 text-xs rounded-md cursor-pointer transition-colors ${u.is_banned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>{u.is_banned ? 'Unban' : 'Ban'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PostsTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminItem[]>([]);
  const [selected, setSelected] = useState<AdminItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof AdminItem | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      const url = `/api/admin/posts${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setRows(json.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey] as any;
      const vb = b[sortKey] as any;
      if (sortKey === 'created_at') {
        const da = va ? new Date(va).getTime() : 0;
        const db = vb ? new Date(vb).getTime() : 0;
        return (da - db) * dir;
      }
      if (sortKey === 'total_likes' || sortKey === 'is_featured') {
        return ((va || 0) - (vb || 0)) * dir;
      }
      if (typeof va === 'boolean' || typeof vb === 'boolean') {
        return ((va ? 1 : 0) - (vb ? 1 : 0)) * dir;
      }
      return String(va || '').localeCompare(String(vb || '')) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: keyof AdminItem) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const onFeatureToggle = async (postId: string, isFeatured: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch('/api/admin/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ postId, is_featured: !isFeatured }) });
      if (res.ok) {
        toast.success(isFeatured ? 'Post unfeatured successfully' : 'Post featured successfully');
        load();
      } else {
        toast.error('Failed to update post feature status');
      }
    } catch (error) {
      toast.error('Failed to update post feature status');
    }
  };

  const onDelete = async (postId: string) => {
    const ok = confirm('Delete this post?');
    if (!ok) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/admin/posts?postId=${encodeURIComponent(postId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        toast.success('Post deleted successfully');
        load();
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Posts</h3>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content..." className="border border-gray-300 rounded-md px-3 py-2 cursor-pointer" />
          <button onClick={load} className="px-3 py-2 rounded-md bg-[#ff5a58] text-white cursor-pointer hover:bg-[#ff4a47] transition-colors">Search</button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => toggleSort('type')}>
                  Type {sortKey === 'type' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => toggleSort('author_name')}>
                  Author {sortKey === 'author_name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => toggleSort('created_at')}>
                  Created {sortKey === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => toggleSort('excerpt')}>
                  Excerpt / Title {sortKey === 'excerpt' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => toggleSort('total_likes')}>
                  Likes {sortKey === 'total_likes' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2 cursor-pointer select-none hover:bg-gray-100 transition-colors" onClick={() => toggleSort('is_featured')}>
                  Featured {sortKey === 'is_featured' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center px-4 py-2 w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(item => (
                <tr key={item.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(item)}>
                  <td className="px-4 py-2 capitalize">{item.type}</td>
                  <td className="px-4 py-2">{item.author_name}</td>
                  <td className="px-4 py-2">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{item.excerpt || '—'}</td>
                  <td className="px-4 py-2">{item.total_likes}</td>
                  <td className="px-4 py-2">{item.is_featured ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-center">
                    {item.type === 'post' ? (
                      <div className="flex gap-2 justify-center items-center">
                        <button onClick={(e) => { e.stopPropagation(); onFeatureToggle(item.id, !!item.is_featured); }} className="px-3 py-1 text-xs rounded-md border cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap min-w-[80px]">{item.is_featured ? 'Unfeature' : 'Feature'}</button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="px-3 py-1 text-xs rounded-md bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-colors whitespace-nowrap min-w-[60px]">Delete</button>
                      </div>
                    ) : (
                      <GuideActions id={item.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold capitalize">{selected.type}</div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-800 cursor-pointer">Close</button>
            </div>
            {selected.type === 'post' ? (
              <AdminPostPreview id={selected.id} />
            ) : (
              <AdminGuidePreview id={selected.id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPostPreview({ id }: { id: string }) {
  const [post, setPost] = useState<any>(null);
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, author:profiles(name, avatar_url), images:post_images(*)')
        .eq('id', id)
        .single();
      if (data) {
        const imageUrls = Array.isArray(data.images) ? data.images.map((img: any) => supabase.storage.from('post-images').getPublicUrl(img.image_path).data.publicUrl) : [];
        setPost({ ...data, imageUrls });
      } else {
        setPost(null);
      }
    };
    run();
  }, [id]);
  if (!post) return <div className="text-gray-500">Loading...</div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="font-semibold">{post.author?.name || 'User'}</div>
        <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</div>
      </div>
      <div className="whitespace-pre-wrap mb-3">{post.content}</div>
      {Array.isArray(post.imageUrls) && post.imageUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {post.imageUrls.map((url: string, idx: number) => (
            <img key={idx} src={url} alt="img" className="w-full h-32 object-cover rounded" />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminGuidePreview({ id }: { id: string }) {
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';
        const res = await fetch(`/api/admin/guides?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok) {
          setTrip(json.guide || null);
        } else {
          setError(json?.error || 'Failed to load');
          setTrip(null);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
        setTrip(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);
  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!trip) return <div className="text-gray-500">Not found.</div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="font-semibold">{trip.author?.name || 'User'}</div>
        <div className="text-xs text-gray-500">{new Date(trip.updated_at || trip.created_at).toLocaleString()}</div>
      </div>
      <div className="mb-2 font-semibold">{trip.title}</div>
      {trip.share_caption && <div className="mb-3 whitespace-pre-wrap">{trip.share_caption}</div>}
      <div className="text-sm text-gray-600">{trip.destination || ''}</div>
      <div className="mt-3">
        <a href={`/trip/view/${trip.id}`} className="text-[#ff5a58] hover:underline cursor-pointer">Open guide</a>
      </div>
    </div>
  );
}

function GuideActions({ id }: { id: string }) {
  const [state, setState] = useState<{ home?: boolean; social?: boolean } | null>(null);
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.from('trips').select('is_featured_home, is_featured_social').eq('id', id).single();
      if (data) setState({ home: !!data.is_featured_home, social: !!data.is_featured_social });
    };
    run();
  }, [id]);

  const toggle = async (field: 'home' | 'social') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const body: any = { tripId: id };
      if (field === 'home') body.is_featured_home = !state?.home;
      if (field === 'social') body.is_featured_social = !state?.social;
      const res = await fetch('/api/admin/guides', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (res.ok) {
        const newValue = !(state && state[field]);
        toast.success(`${field === 'home' ? 'Home' : 'Social'} feature ${newValue ? 'enabled' : 'disabled'} successfully`);
        setState(prev => ({ ...(prev || {}), [field]: newValue } as any));
      } else {
        toast.error(`Failed to update ${field} feature status`);
      }
    } catch (error) {
      toast.error(`Failed to update ${field} feature status`);
    }
  };

  if (!state) return <div className="flex justify-center"><span className="text-xs text-gray-400">Loading...</span></div>;
  return (
    <div className="flex gap-2 justify-center items-center">
      <button onClick={(e) => { e.stopPropagation(); toggle('home'); }} className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap min-w-[100px] ${state.home ? 'bg-green-600 hover:bg-green-700 text-white' : 'border hover:bg-gray-100'}`}>{state.home ? 'Unfeature Home' : 'Feature Home'}</button>
      <button onClick={(e) => { e.stopPropagation(); toggle('social'); }} className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap min-w-[100px] ${state.social ? 'bg-green-600 hover:bg-green-700 text-white' : 'border hover:bg-gray-100'}`}>{state.social ? 'Unfeature Social' : 'Feature Social'}</button>
    </div>
  );
}

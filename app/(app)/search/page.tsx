'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { Profile, Post } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { Search as SearchIcon, X, Heart, MessageCircle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SearchPage() {
  const { user, isMock } = useAuth();
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (isMock) {
      const load = () => {
        const users = mockStore.getAllUsers().filter((u) => u.id !== user.id);
        setAllUsers(users);
        setExplorePosts(mockStore.getPosts());
        setLoading(false);
      };
      load();
      const unsub = mockStore.subscribe(load);
      return () => unsub();
    } else {
      const fetchUsers = async () => {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', user.id);

          setAllUsers(data || []);
          setExplorePosts(mockStore.getPosts());
        } catch (err) {
          console.warn('Error fetching search profiles', err);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [user, isMock]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q)
    );
  }, [query, allUsers]);

  return (
    <div className="max-w-[935px] mx-auto py-6 px-4 space-y-6">
      {/* Search Input Bar */}
      <div className="max-w-[360px] mx-auto relative">
        <SearchIcon className="w-4 h-4 absolute left-4 top-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts"
          className="w-full pl-11 pr-9 py-2 rounded-lg bg-[#EFEFEF] text-sm text-gray-900 focus:outline-none focus:bg-[#EFEFEF] transition placeholder-gray-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Real Users Search Results */}
      <div className="max-w-[440px] mx-auto bg-white border border-[#DBDBDB] rounded-xl overflow-hidden shadow-subtle divide-y divide-[#EFEFEF]">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 space-y-1">
            <Users className="w-8 h-8 mx-auto text-gray-300 stroke-[1.5] mb-2" />
            <p className="font-semibold text-gray-800">
              {query.trim() ? `No accounts matching "${query}"` : 'No other accounts yet'}
            </p>
            <p className="text-xs text-gray-400">
              {query.trim()
                ? 'Check the spelling or try searching for another username.'
                : 'When new users join Shnik, they will appear here.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((profile) => (
            <div
              key={profile.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAFA] transition"
            >
              <Link
                href={`/profile/${profile.username}`}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.full_name}
                  size="md"
                />
                <div className="truncate">
                  <span className="font-semibold text-sm text-gray-900 block truncate">
                    {profile.username}
                  </span>
                  <span className="text-xs text-gray-400 block truncate">
                    {profile.full_name} • {(profile.followers_count || 0).toLocaleString()} followers
                  </span>
                </div>
              </Link>

              <FollowButton
                userId={profile.id}
                initialIsFollowing={profile.is_following}
                size="sm"
              />
            </div>
          ))
        )}
      </div>

      {/* Explore Grid if posts exist */}
      {explorePosts.length > 0 && (
        <div className="pt-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Explore</h2>
          <div className="grid grid-cols-3 gap-1 md:gap-7">
            {explorePosts.map((post) => (
              <Link
                key={post.id}
                href={`/profile/${post.user.username}`}
                className="relative aspect-square bg-gray-100 group cursor-pointer overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image_url}
                  alt={post.caption}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-5 h-5 fill-white" />
                    {post.likes_count}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-5 h-5 fill-white" />
                    {post.comments.length}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

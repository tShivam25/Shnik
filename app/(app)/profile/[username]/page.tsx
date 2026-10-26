'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { Profile, Post } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import {
  Camera,
  Grid,
  Bookmark,
  UserCheck,
  Heart,
  MessageCircle,
  Settings,
  X,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params?.username as string;
  const { user: currentUser, isMock, refreshUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isOwnProfile =
    currentUser &&
    profile &&
    (currentUser.id === profile.id ||
      currentUser.username.toLowerCase() === profile.username.toLowerCase());

  const loadProfile = useCallback(async () => {
    if (!usernameParam) return;

    if (isMock) {
      const found = mockStore.getUserByUsername(usernameParam);
      if (found) {
        setProfile(found);
        setEditFullName(found.full_name);
        setEditBio(found.bio || '');

        const posts = mockStore.getUserPosts(found.id);
        setUserPosts(posts.length > 0 ? posts : mockStore.getPosts());
      }
      setLoading(false);
    } else {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', usernameParam.toLowerCase())
          .single();

        if (data) {
          const { count: followersCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('followee_id', data.id);

          const { count: followingCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', data.id);

          let isFollowing = false;
          if (currentUser) {
            const { data: followRecord } = await supabase
              .from('follows')
              .select('*')
              .match({ follower_id: currentUser.id, followee_id: data.id })
              .maybeSingle();
            isFollowing = !!followRecord;
          }

          const decorated: Profile = {
            ...data,
            followers_count: followersCount || 0,
            following_count: followingCount || 0,
            is_following: isFollowing,
          };

          setProfile(decorated);
          setEditFullName(decorated.full_name);
          setEditBio(decorated.bio || '');
          setUserPosts(mockStore.getPosts());
        }
      } catch (err) {
        console.warn('Error fetching profile from Supabase', err);
      } finally {
        setLoading(false);
      }
    }
  }, [usernameParam, isMock, currentUser]);

  useEffect(() => {
    loadProfile();

    if (isMock) {
      const unsub = mockStore.subscribe(() => {
        loadProfile();
      });
      return () => unsub();
    }
  }, [loadProfile, isMock]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !currentUser) return;

    setUploadingAvatar(true);
    try {
      if (isMock) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          mockStore.updateProfile(currentUser.id, { avatar_url: dataUrl });
          setProfile((prev) => (prev ? { ...prev, avatar_url: dataUrl } : null));
          refreshUser();
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
      } else {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const filePath = `${currentUser.id}/avatar.${fileExt}`;

        await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const newAvatarUrl = publicUrlData.publicUrl;

        await supabase
          .from('profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', currentUser.id);

        setProfile((prev) => (prev ? { ...prev, avatar_url: newAvatarUrl } : null));
        await refreshUser();
        setUploadingAvatar(false);
      }
    } catch (err) {
      console.error('Failed to upload avatar', err);
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      if (isMock) {
        const updated = mockStore.updateProfile(currentUser.id, {
          full_name: editFullName.trim(),
          bio: editBio.trim(),
        });
        setProfile(updated);
        await refreshUser();
      } else {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({
            full_name: editFullName.trim(),
            bio: editBio.trim(),
          })
          .eq('id', currentUser.id);

        await refreshUser();
        await loadProfile();
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900">User Not Found</h2>
        <p className="text-sm text-gray-500 mt-1">
          The link you followed may be broken, or the page may have been removed.
        </p>
        <Link
          href="/home"
          className="mt-4 inline-block font-semibold text-[#0095F6] hover:underline"
        >
          Go back to Shnik.
        </Link>
      </div>
    );
  }

  const highlights = [
    { name: 'Moments', img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80' },
    { name: 'Trips', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=150&q=80' },
    { name: 'Studio', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=150&q=80' },
    { name: 'Favorites', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=150&q=80' },
  ];

  return (
    <div className="max-w-[935px] mx-auto py-6 md:py-9 px-4">
      {/* Instagram Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-20 pb-8 md:pb-12 border-b border-[#DBDBDB]">
        {/* Avatar Area */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={profile.avatar_url}
            name={profile.full_name}
            size="2xl"
            hasRing
          />

          {isOwnProfile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-black text-white hover:opacity-80 transition"
                title="Change Profile Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 w-full space-y-4">
          {/* Top row: username, actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h1 className="text-xl font-normal text-gray-900 tracking-tight">
              {profile.username}
            </h1>

            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 rounded-lg bg-[#EFEFEF] hover:bg-[#DBDBDB] text-sm font-semibold text-gray-900 transition"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    className="px-4 py-1.5 rounded-lg bg-[#EFEFEF] hover:bg-[#DBDBDB] text-sm font-semibold text-gray-900 transition"
                  >
                    View archive
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-gray-900 hover:opacity-60"
                  >
                    <Settings className="w-5 h-5 stroke-[1.8]" />
                  </button>
                </>
              ) : (
                <>
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={profile.is_following}
                    size="md"
                  />
                  <button
                    type="button"
                    onClick={() => router.push(`/messages/${profile.id}`)}
                    className="px-4 py-1.5 rounded-lg bg-[#EFEFEF] hover:bg-[#DBDBDB] text-sm font-semibold text-gray-900 transition"
                  >
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats row: Posts, Followers, Following */}
          <div className="flex items-center gap-8 text-[15px]">
            <div>
              <span className="font-semibold text-gray-900">
                {profile.posts_count || userPosts.length}
              </span>{' '}
              <span className="text-gray-900">posts</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                {(profile.followers_count || 0).toLocaleString()}
              </span>{' '}
              <span className="text-gray-900">followers</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                {(profile.following_count || 0).toLocaleString()}
              </span>{' '}
              <span className="text-gray-900">following</span>
            </div>
          </div>

          {/* Full Name & Bio */}
          <div className="text-sm space-y-1">
            <div className="font-semibold text-gray-900">{profile.full_name}</div>
            {profile.bio && (
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed max-w-md">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Story Highlights */}
      <div className="py-7 flex gap-7 overflow-x-auto no-scrollbar">
        {highlights.map((hl, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="p-[2px] rounded-full border border-[#DBDBDB]">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hl.img}
                  alt={hl.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-900">{hl.name}</span>
          </div>
        ))}
      </div>

      {/* Tabs: POSTS / SAVED / TAGGED */}
      <div className="flex justify-center border-t border-[#DBDBDB]">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 py-4 px-6 text-xs uppercase tracking-widest font-semibold border-t -mt-[1px] transition-colors ${
            activeTab === 'posts'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Grid className="w-3.5 h-3.5 stroke-[2]" />
          <span>Posts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 py-4 px-6 text-xs uppercase tracking-widest font-semibold border-t -mt-[1px] transition-colors ${
            activeTab === 'saved'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 stroke-[2]" />
          <span>Saved</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tagged')}
          className={`flex items-center gap-1.5 py-4 px-6 text-xs uppercase tracking-widest font-semibold border-t -mt-[1px] transition-colors ${
            activeTab === 'tagged'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 stroke-[2]" />
          <span>Tagged</span>
        </button>
      </div>

      {/* 3-Column Instagram Photo Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-7 mt-1">
        {userPosts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square bg-gray-100 group cursor-pointer overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt={post.caption}
              className="w-full h-full object-cover"
            />

            {/* Hover Overlay with Likes & Comments Count */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold">
              <span className="flex items-center gap-2">
                <Heart className="w-5 h-5 fill-white" />
                {post.likes_count}
              </span>
              <span className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 fill-white" />
                {post.comments.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-dropdown border border-[#DBDBDB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DBDBDB]">
              <h3 className="font-semibold text-base text-gray-900">Edit profile</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#DBDBDB] text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell your friends about yourself..."
                  className="w-full px-3.5 py-2 rounded-lg border border-[#DBDBDB] text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0095F6] hover:bg-[#1877F2] transition"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

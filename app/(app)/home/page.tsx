'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { Profile, Post } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Smile,
  PlusSquare,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const { user, isMock } = useAuth();
  const [following, setFollowing] = useState<Profile[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (isMock) {
      const loadMockData = () => {
        const myFollowing = mockStore.getFollowing(user.id);
        const allUsers = mockStore.getAllUsers();
        const followingIds = new Set(myFollowing.map((u) => u.id));
        followingIds.add(user.id);

        const mySuggested = allUsers.filter((u) => !followingIds.has(u.id));
        const feedPosts = mockStore.getPosts();

        setFollowing(myFollowing);
        setSuggested(mySuggested);
        setPosts(feedPosts);
        setLoading(false);
      };

      loadMockData();
      const unsubscribe = mockStore.subscribe(loadMockData);
      return () => unsubscribe();
    } else {
      const fetchSupabaseData = async () => {
        try {
          const supabase = createClient();

          const { data: followsData } = await supabase
            .from('follows')
            .select('followee_id')
            .eq('follower_id', user.id);

          const followeeIds = (followsData || []).map((f) => f.followee_id);

          if (followeeIds.length > 0) {
            const { data: followingProfiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', followeeIds);
            setFollowing(followingProfiles || []);
          } else {
            setFollowing([]);
          }

          const excludeIds = [user.id, ...followeeIds];
          const { data: suggestedProfiles } = await supabase
            .from('profiles')
            .select('*')
            .not('id', 'in', `(${excludeIds.join(',')})`)
            .limit(5);

          setSuggested(suggestedProfiles || []);
          setPosts(mockStore.getPosts());
        } catch (err) {
          console.warn('Error fetching home data from Supabase', err);
        } finally {
          setLoading(false);
        }
      };

      fetchSupabaseData();
    }
  }, [user, isMock]);

  const handleLikePost = (postId: string) => {
    if (isMock) {
      mockStore.toggleLikePost(postId);
    }
  };

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    if (isMock) {
      mockStore.addCommentToPost(postId, commentText);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  return (
    <div className="max-w-[935px] mx-auto pt-4 md:pt-7 px-0 md:px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 max-w-[470px] mx-auto w-full">
          {/* Stories Tray */}
          <div className="bg-white border-y md:border border-[#DBDBDB] md:rounded-xl p-3.5 mb-4 overflow-x-auto no-scrollbar flex items-center gap-4">
            {/* Own story item */}
            {user && (
              <div className="flex flex-col items-center gap-1 min-w-[66px] cursor-pointer group">
                <div className="relative">
                  <Avatar
                    src={user.avatar_url}
                    name={user.full_name}
                    size="lg"
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#0095F6] text-white flex items-center justify-center text-xs font-bold border-2 border-white">
                    +
                  </div>
                </div>
                <span className="text-[12px] text-gray-500 truncate w-full text-center">
                  Your story
                </span>
              </div>
            )}

            {/* Followed stories */}
            {following.map((person) => (
              <Link
                key={person.id}
                href={`/messages/${person.id}`}
                className="flex flex-col items-center gap-1 min-w-[66px] group transition-transform active:scale-95 text-center"
              >
                <Avatar
                  src={person.avatar_url}
                  name={person.full_name}
                  size="lg"
                  hasRing
                />
                <span className="text-[12px] text-gray-900 truncate w-full group-hover:text-black">
                  {person.username}
                </span>
              </Link>
            ))}
          </div>

          {/* Posts Feed or Clean Empty State */}
          {posts.length === 0 ? (
            <div className="bg-white border-y md:border border-[#DBDBDB] md:rounded-xl p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mx-auto text-black mb-2">
                <PlusSquare className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome to Shnik, {user?.full_name}!
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                When you or people you follow share photos, they will appear here in your feed.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/search"
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-[#0095F6] hover:bg-[#1877F2] transition"
                >
                  Find accounts to follow
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white border-y md:border border-[#DBDBDB] md:rounded-xl overflow-hidden"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-3.5 py-3">
                    <Link
                      href={`/profile/${post.user.username}`}
                      className="flex items-center gap-3 group"
                    >
                      <Avatar
                        src={post.user.avatar_url}
                        name={post.user.full_name}
                        size="sm"
                        hasRing
                      />
                      <div>
                        <span className="font-semibold text-sm text-gray-900 group-hover:opacity-80">
                          {post.user.username}
                        </span>
                      </div>
                    </Link>

                    <button
                      type="button"
                      className="text-gray-500 hover:text-black p-1"
                      title="More options"
                    >
                      <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
                    </button>
                  </div>

                  {/* Post Image */}
                  <div className="relative aspect-square w-full bg-gray-100 select-none overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                      onDoubleClick={() => handleLikePost(post.id)}
                    />
                  </div>

                  {/* Action Icons Bar */}
                  <div className="px-3.5 pt-3 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleLikePost(post.id)}
                          className={`transition-transform active:scale-125 ${
                            post.is_liked ? 'text-[#ED4956]' : 'text-gray-900 hover:opacity-60'
                          }`}
                        >
                          <Heart
                            className={`w-6 h-6 stroke-[1.8] ${
                              post.is_liked ? 'fill-[#ED4956]' : ''
                            }`}
                          />
                        </button>

                        <Link
                          href={`/messages/${post.user.id}`}
                          className="text-gray-900 hover:opacity-60"
                        >
                          <MessageCircle className="w-6 h-6 stroke-[1.8]" />
                        </Link>

                        <Link
                          href={`/messages/${post.user.id}`}
                          className="text-gray-900 hover:opacity-60"
                        >
                          <Send className="w-6 h-6 stroke-[1.8]" />
                        </Link>
                      </div>

                      <button
                        type="button"
                        className="text-gray-900 hover:opacity-60"
                      >
                        <Bookmark className="w-6 h-6 stroke-[1.8]" />
                      </button>
                    </div>

                    {/* Likes Count */}
                    <div className="font-semibold text-sm text-gray-900 mb-1">
                      {post.likes_count.toLocaleString()} likes
                    </div>

                    {/* Caption */}
                    <div className="text-sm text-gray-900 leading-snug">
                      <Link
                        href={`/profile/${post.user.username}`}
                        className="font-semibold mr-1.5 hover:underline"
                      >
                        {post.user.username}
                      </Link>
                      <span>{post.caption}</span>
                    </div>

                    {/* Comments */}
                    {post.comments.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="text-sm text-gray-900">
                            <span className="font-semibold mr-1.5">
                              {comment.username}
                            </span>
                            <span>{comment.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-2">
                      {new Date(post.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Add Comment Input */}
                  <form
                    onSubmit={(e) => handleAddComment(post.id, e)}
                    className="px-3.5 py-3 border-t border-[#EFEFEF] flex items-center gap-2"
                  >
                    <Smile className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Add a comment..."
                      className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400"
                    />
                    {commentInputs[post.id]?.trim() && (
                      <button
                        type="submit"
                        className="text-sm font-semibold text-[#0095F6] hover:text-[#1877F2]"
                      >
                        Post
                      </button>
                    )}
                  </form>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Right Sidebar */}
        <aside className="hidden lg:block lg:col-span-4 pt-2">
          {user && (
            <div className="flex items-center justify-between mb-6">
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-3 group"
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="md"
                />
                <div className="leading-tight">
                  <span className="font-semibold text-sm text-gray-900 block group-hover:opacity-80">
                    {user.username}
                  </span>
                  <span className="text-xs text-gray-400">{user.full_name}</span>
                </div>
              </Link>
            </div>
          )}

          {/* Suggestions Header */}
          {suggested.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500">
                  Suggested for you
                </span>
                <Link
                  href="/search"
                  className="text-xs font-semibold text-gray-900 hover:opacity-60"
                >
                  See All
                </Link>
              </div>

              <div className="space-y-3">
                {suggested.slice(0, 5).map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/profile/${person.username}`}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      <Avatar
                        src={person.avatar_url}
                        name={person.full_name}
                        size="sm"
                      />
                      <div className="truncate leading-tight">
                        <span className="font-semibold text-xs text-gray-900 block truncate group-hover:opacity-80">
                          {person.username}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate block">
                          Suggested for you
                        </span>
                      </div>
                    </Link>

                    <FollowButton
                      userId={person.id}
                      initialIsFollowing={person.is_following}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Instagram Footer Links */}
          <footer className="mt-8 text-[11px] text-[#C7C7C7] leading-relaxed">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <a href="#" className="hover:underline">About</a> •
              <a href="#" className="hover:underline">Help</a> •
              <a href="#" className="hover:underline">Press</a> •
              <a href="#" className="hover:underline">API</a> •
              <a href="#" className="hover:underline">Jobs</a> •
              <a href="#" className="hover:underline">Privacy</a> •
              <a href="#" className="hover:underline">Terms</a> •
              <a href="#" className="hover:underline">Language</a>
            </div>
            <div className="mt-4 uppercase tracking-wider text-[11px]">
              © 2026 SHNIK
            </div>
          </footer>
        </aside>
      </div>
    </div>
  );
}

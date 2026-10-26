'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function NotificationsPage() {
  const { user, isMock } = useAuth();
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (isMock) {
      const load = () => {
        const myFollowers = mockStore.getFollowers(user.id);
        setFollowers(myFollowers);
        setLoading(false);
      };
      load();
      const unsub = mockStore.subscribe(load);
      return () => unsub();
    } else {
      const fetchFollowers = async () => {
        try {
          const supabase = createClient();
          const { data: followRecords } = await supabase
            .from('follows')
            .select('follower_id, created_at')
            .eq('followee_id', user.id)
            .order('created_at', { ascending: false });

          const followerIds = (followRecords || []).map((f) => f.follower_id);

          if (followerIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', followerIds);

            setFollowers(profiles || []);
          } else {
            setFollowers([]);
          }
        } catch (err) {
          console.warn('Error fetching followers for notifications', err);
        } finally {
          setLoading(false);
        }
      };

      fetchFollowers();
    }
  }, [user, isMock]);

  return (
    <div className="max-w-[480px] mx-auto py-6 px-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900 tracking-tight">Notifications</h1>

      <div className="bg-white border border-[#DBDBDB] rounded-xl overflow-hidden divide-y divide-[#EFEFEF]">
        <div className="px-4 py-3 bg-[#FAFAFA] font-semibold text-xs text-gray-500 uppercase tracking-wider">
          Earlier
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Loading...
          </div>
        ) : followers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Heart className="w-8 h-8 mx-auto text-gray-300 mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-gray-900">Activity On Your Posts</p>
            <p className="text-xs text-gray-400 mt-1">
              When people follow you or like your photos, you&apos;ll see it here.
            </p>
          </div>
        ) : (
          followers.map((follower) => (
            <div
              key={follower.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAFA] transition"
            >
              <Link
                href={`/profile/${follower.username}`}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar
                  src={follower.avatar_url}
                  name={follower.full_name}
                  size="md"
                  hasRing
                />
                <div className="text-sm text-gray-900 leading-snug">
                  <span className="font-semibold">{follower.username}</span>{' '}
                  started following you.{' '}
                  <span className="text-xs text-gray-400 block mt-0.5">2d</span>
                </div>
              </Link>

              <FollowButton
                userId={follower.id}
                initialIsFollowing={follower.is_following}
                size="sm"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

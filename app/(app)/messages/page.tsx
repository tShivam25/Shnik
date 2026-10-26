'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { Conversation, Profile } from '@/lib/types';
import { ConversationList } from '@/components/ConversationList';
import { Avatar } from '@/components/Avatar';
import { Edit, MessageCircle, X, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MessagesInboxPage() {
  const { user, isMock } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (isMock) {
      const load = () => {
        const convs = mockStore.getConversations(user.id) as Conversation[];
        const myFollowing = mockStore.getFollowing(user.id);
        setConversations(convs);
        setFollowing(myFollowing);
        setLoading(false);
      };
      load();
      const unsub = mockStore.subscribe(load);
      return () => unsub();
    } else {
      const fetchConvs = async () => {
        try {
          const supabase = createClient();

          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          const otherUserIds = Array.from(
            new Set((messages || []).map((m) => (m.sender_id === user.id ? m.recipient_id : m.sender_id)))
          );

          if (otherUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', otherUserIds);

            const convList: Conversation[] = (profiles || []).map((prof) => {
              const last = (messages || []).find(
                (m) =>
                  (m.sender_id === prof.id && m.recipient_id === user.id) ||
                  (m.sender_id === user.id && m.recipient_id === prof.id)
              );
              return {
                otherUser: prof,
                lastMessage: last,
              };
            });
            setConversations(convList);
          } else {
            setConversations([]);
          }

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
          }
        } catch (err) {
          console.warn('Error fetching inbox conversations', err);
        } finally {
          setLoading(false);
        }
      };

      fetchConvs();
    }
  }, [user, isMock]);

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex bg-white border-x border-[#DBDBDB] max-w-[935px] mx-auto overflow-hidden">
      {/* Inbox Column */}
      <div className="w-full md:w-[350px] border-r border-[#DBDBDB] flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-4 border-b border-[#DBDBDB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-gray-900">
              {user?.username}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="text-gray-900 hover:opacity-60 p-1"
            title="New message"
          >
            <Edit className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        {/* Tab Header (Primary / General) */}
        <div className="flex border-b border-[#DBDBDB] text-center text-sm font-semibold">
          <div className="flex-1 py-3 text-black border-b-2 border-black -mb-[1px]">
            Messages
          </div>
          <div className="flex-1 py-3 text-gray-400">
            Requests
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Loading messages...
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              currentUserId={user?.id}
            />
          )}
        </div>
      </div>

      {/* Desktop Placeholder Right Column */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-white">
        <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center text-black mb-4">
          <MessageCircle className="w-12 h-12 stroke-[1.5]" />
        </div>
        <h2 className="text-xl font-normal text-gray-900">Your Messages</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Send private photos and messages to a friend or group.
        </p>
        <button
          type="button"
          onClick={() => setShowNewChatModal(true)}
          className="mt-5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-[#0095F6] hover:bg-[#1877F2] transition"
        >
          Send message
        </button>
      </div>

      {/* New Message Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 shadow-dropdown border border-[#DBDBDB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DBDBDB]">
              <span className="font-semibold text-base text-gray-900">New message</span>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 max-h-80 overflow-y-auto divide-y divide-gray-50">
              {following.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  <p className="font-semibold text-gray-800">You don&apos;t follow anyone yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    You can only message accounts that you follow.
                  </p>
                  <Link
                    href="/search"
                    onClick={() => setShowNewChatModal(false)}
                    className="mt-3 inline-block font-semibold text-[#0095F6] hover:underline"
                  >
                    Find people to follow →
                  </Link>
                </div>
              ) : (
                following.map((person) => (
                  <Link
                    key={person.id}
                    href={`/messages/${person.id}`}
                    onClick={() => setShowNewChatModal(false)}
                    className="py-3 px-2 flex items-center gap-3 hover:bg-[#FAFAFA] rounded-lg transition-colors"
                  >
                    <Avatar
                      src={person.avatar_url}
                      name={person.full_name}
                      size="md"
                    />
                    <div className="flex-1 truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {person.full_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        @{person.username}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0095F6]">
                      Chat
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

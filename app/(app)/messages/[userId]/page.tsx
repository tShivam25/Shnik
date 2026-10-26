'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { useGateway } from '@/lib/gateway';
import { Message, Profile, Alert } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ChatBubble } from '@/components/ChatBubble';
import { AlertBanner } from '@/components/AlertBanner';
import { FollowButton } from '@/components/FollowButton';
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  Smile,
  Image as ImageIcon,
  Heart,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const otherUserId = params?.userId as string;
  const { user, isMock } = useAuth();
  const { connectionStatus, stageEvents, getStageForMessage } = useGateway();

  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadData = useCallback(async () => {
    if (!user || !otherUserId) return;

    if (isMock) {
      const targetUser = mockStore.getUserById(otherUserId);
      if (!targetUser) {
        router.push('/messages');
        return;
      }

      const following = mockStore.isFollowing(user.id, otherUserId);
      const thread = mockStore.getMessagesBetween(user.id, otherUserId);
      const userAlerts = mockStore.getAlertsForUser(user.id);

      setOtherUser(targetUser);
      setIsFollowing(following);
      setMessages(thread);
      setAlerts(userAlerts);
      setLoading(false);
    } else {
      try {
        const supabase = createClient();

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();

        if (!profile) {
          router.push('/messages');
          return;
        }
        setOtherUser(profile);

        const { data: followRecord } = await supabase
          .from('follows')
          .select('*')
          .match({ follower_id: user.id, followee_id: otherUserId })
          .maybeSingle();

        setIsFollowing(!!followRecord);

        const { data: msgList } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
          )
          .order('created_at', { ascending: true });

        setMessages(msgList || []);

        const { data: alertList } = await supabase
          .from('alerts')
          .select('*')
          .contains('user_ids', [user.id])
          .order('created_at', { ascending: false });

        setAlerts(alertList || []);
      } catch (err) {
        console.warn('Error fetching conversation from Supabase', err);
      } finally {
        setLoading(false);
      }
    }
  }, [user, otherUserId, isMock, router]);

  useEffect(() => {
    loadData();

    if (isMock) {
      const unsub = mockStore.subscribe(() => {
        loadData();
      });
      return () => unsub();
    } else {
      const supabase = createClient();
      const channel = supabase
        .channel(`chat_${otherUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            loadData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alerts' },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadData, isMock, otherUserId]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

  const handleSendMessage = async (forceFailure: boolean = false) => {
    if (!inputText.trim() || !user || !otherUserId || !isFollowing || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      if (isMock) {
        mockStore.queueAndSendMessage(
          otherUserId,
          textToSend,
          undefined,
          forceFailure
        );
      } else {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: user.id,
            to: otherUserId,
            text: textToSend,
            forceFailure,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to dispatch message');
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    if (isMock) {
      mockStore.dismissAlert(alertId);
    } else {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  if (!otherUser) {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen bg-white">
      {/* Instagram DM Header */}
      <div className="px-4 py-3 border-b border-[#DBDBDB] flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            className="p-1 -ml-1 text-gray-900 hover:opacity-60 transition"
          >
            <ArrowLeft className="w-6 h-6 stroke-[1.8]" />
          </Link>

          <Link
            href={`/profile/${otherUser.username}`}
            className="flex items-center gap-3 group"
          >
            <Avatar
              src={otherUser.avatar_url}
              name={otherUser.full_name}
              size="sm"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900 block group-hover:opacity-80">
                {otherUser.full_name}
              </span>
              <span className="text-[12px] text-gray-400 block -mt-0.5">
                @{otherUser.username}
              </span>
            </div>
          </Link>
        </div>

        {/* Action icons like Instagram Direct */}
        <div className="flex items-center gap-4 text-gray-900">
          <button type="button" className="hover:opacity-60" title="Audio call">
            <Phone className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button type="button" className="hover:opacity-60" title="Video call">
            <Video className="w-5 h-5 stroke-[1.8]" />
          </button>
          <Link href={`/profile/${otherUser.username}`} className="hover:opacity-60" title="Profile Details">
            <Info className="w-5 h-5 stroke-[1.8]" />
          </Link>
        </div>
      </div>

      {/* Main Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />

        {/* User Card at top of thread */}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Avatar
            src={otherUser.avatar_url}
            name={otherUser.full_name}
            size="xl"
            hasRing
          />
          <h2 className="font-semibold text-base text-gray-900 mt-3">
            {otherUser.full_name}
          </h2>
          <p className="text-xs text-gray-500">
            {otherUser.username} • Shnik
          </p>
          <Link
            href={`/profile/${otherUser.username}`}
            className="mt-3 px-4 py-1.5 rounded-lg bg-[#EFEFEF] hover:bg-[#DBDBDB] text-xs font-semibold text-gray-900 transition"
          >
            View profile
          </Link>
        </div>

        {/* Message Stream */}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isMine={user ? msg.sender_id === user.id : false}
            gatewayEvent={getStageForMessage(msg.id, msg.stage)}
            otherUserAvatar={otherUser.avatar_url}
            otherUserName={otherUser.full_name}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input or Follow Constraint */}
      <div className="p-4 border-t border-[#DBDBDB] bg-white">
        {!isFollowing ? (
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#DBDBDB] text-center flex flex-col items-center gap-2 max-w-md mx-auto">
            <p className="text-sm font-semibold text-gray-900">
              Follow @{otherUser.username} to message them
            </p>
            <p className="text-xs text-gray-500">
              You can only message accounts that you follow on Shnik.
            </p>
            <FollowButton
              userId={otherUser.id}
              initialIsFollowing={false}
              onToggle={(following) => setIsFollowing(following)}
              size="sm"
              className="mt-1"
            />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(false);
            }}
            className="flex items-center gap-3 max-w-4xl mx-auto border border-[#DBDBDB] rounded-full px-3.5 py-2 focus-within:border-gray-400 transition"
          >
            <Smile className="w-6 h-6 text-gray-900 stroke-[1.8] cursor-pointer" />

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message..."
              disabled={sending}
              className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder-gray-400"
            />

            {inputText.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="text-sm font-semibold text-[#0095F6] hover:text-[#1877F2] select-none"
              >
                Send
              </button>
            ) : (
              <div className="flex items-center gap-3 text-gray-900">
                <ImageIcon className="w-5 h-5 stroke-[1.8] cursor-pointer" />
                <Heart className="w-5 h-5 stroke-[1.8] cursor-pointer" />
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

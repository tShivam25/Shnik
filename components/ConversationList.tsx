'use client';

import React from 'react';
import Link from 'next/link';
import { Conversation } from '@/lib/types';
import { Avatar } from './Avatar';

interface ConversationListProps {
  conversations: Conversation[];
  activeUserId?: string;
  currentUserId?: string;
}

export function ConversationList({
  conversations,
  activeUserId,
  currentUserId,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="font-semibold text-sm text-gray-900">No messages yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Follow friends to start direct messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-transparent">
      {conversations.map(({ otherUser, lastMessage }) => {
        const isActive = activeUserId === otherUser.id;
        const isMine = lastMessage && currentUserId && lastMessage.sender_id === currentUserId;

        const timeStr = lastMessage
          ? new Date(lastMessage.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        return (
          <Link
            key={otherUser.id}
            href={`/messages/${otherUser.id}`}
            className={`flex items-center gap-3.5 px-4 py-3 transition-colors cursor-pointer hover:bg-[#FAFAFA] ${
              isActive ? 'bg-[#EFEFEF]/60' : ''
            }`}
          >
            <Avatar
              src={otherUser.avatar_url}
              name={otherUser.full_name}
              size="md"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-[14px] text-gray-900 truncate">
                  {otherUser.full_name}
                </span>
                {timeStr && (
                  <span className="text-[11px] text-gray-400 font-normal">
                    {timeStr}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {lastMessage ? (
                  <>
                    {isMine && <span className="text-gray-400">You: </span>}
                    <span className="truncate flex-1">{lastMessage.body}</span>
                  </>
                ) : (
                  <span className="text-gray-400">Sent a message</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

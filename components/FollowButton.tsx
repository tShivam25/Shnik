'use client';

import React, { useState } from 'react';
import { mockStore } from '@/lib/mockStore';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  onToggle?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function FollowButton({
  userId,
  initialIsFollowing = false,
  onToggle,
  size = 'md',
  className = '',
}: FollowButtonProps) {
  const { user, isMock } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (user && user.id === userId) {
    return null;
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;

    setIsLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      if (isMock) {
        const result = mockStore.toggleFollow(userId);
        setIsFollowing(result);
        if (onToggle) onToggle(result);
      } else {
        const supabase = createClient();
        if (isFollowing) {
          await supabase
            .from('follows')
            .delete()
            .match({ follower_id: user.id, followee_id: userId });
        } else {
          await supabase
            .from('follows')
            .insert({ follower_id: user.id, followee_id: userId });
        }
        if (onToggle) onToggle(nextState);
      }
    } catch (err) {
      console.error('Failed to toggle follow', err);
      setIsFollowing(!nextState);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'px-3.5 py-1 text-xs' : 'px-4 py-1.5 text-[14px]';

  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        className={`font-semibold rounded-lg transition-colors select-none ${sizeClasses} ${
          isHovered
            ? 'bg-[#EFEFEF] text-red-600'
            : 'bg-[#EFEFEF] text-black hover:bg-[#DBDBDB]'
        } ${className}`}
      >
        {isLoading ? '...' : isHovered ? 'Unfollow' : 'Following'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={`font-semibold text-white rounded-lg bg-[#0095F6] hover:bg-[#1877F2] active:opacity-80 transition-colors select-none ${sizeClasses} ${className}`}
    >
      {isLoading ? '...' : 'Follow'}
    </button>
  );
}

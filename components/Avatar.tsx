'use client';

import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hasRing?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-28 h-28 sm:w-36 sm:h-36 text-3xl',
};

export function Avatar({
  src,
  name,
  size = 'md',
  hasRing = false,
  className = '',
  onClick,
}: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const avatarElement = (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center bg-[#EFEFEF] text-gray-700 font-medium select-none ${
        sizeClasses[size]
      } ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="font-semibold text-gray-600">{initials}</span>
      )}
    </div>
  );

  if (hasRing) {
    return (
      <div
        onClick={onClick}
        className={`p-[2.5px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] transition-transform hover:scale-105 inline-block ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <div className="bg-white p-[2px] rounded-full">{avatarElement}</div>
      </div>
    );
  }

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full focus:outline-none focus:ring-1 focus:ring-gray-300 transition-transform active:scale-95"
    >
      {avatarElement}
    </button>
  ) : (
    avatarElement
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from './Avatar';
import { Home, Search, PlusSquare, Heart } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Create', href: '/create', icon: PlusSquare },
    { label: 'Notifications', href: '/notifications', icon: Heart },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[49px] bg-white border-t border-[#DBDBDB] flex items-center justify-around z-30 px-2 safe-area-pb">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/home' && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-center w-12 h-12 text-black transition-colors"
          >
            <Icon
              className={`w-6 h-6 transition-transform ${
                isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'
              }`}
            />
          </Link>
        );
      })}

      {/* User profile avatar tab */}
      {user && (
        <Link
          href={`/profile/${user.username}`}
          className="flex items-center justify-center w-12 h-12"
        >
          <div
            className={`rounded-full p-[1px] ${
              pathname?.startsWith('/profile') ? 'ring-2 ring-black' : ''
            }`}
          >
            <Avatar src={user.avatar_url} name={user.full_name} size="xs" />
          </div>
        </Link>
      )}
    </nav>
  );
}

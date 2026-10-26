'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from './Avatar';
import {
  Home,
  Search,
  Compass,
  MessageCircle,
  Heart,
  PlusSquare,
  LogOut,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Explore', href: '/search', icon: Compass },
    { label: 'Messages', href: '/messages', icon: MessageCircle },
    { label: 'Notifications', href: '/notifications', icon: Heart },
    { label: 'Create', href: '/create', icon: PlusSquare },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[245px] xl:w-[260px] h-screen border-r border-[#EFEFEF] bg-white px-3 py-5 sticky top-0 z-20 justify-between select-none">
      <div>
        {/* Shnik Brand Logo */}
        <Link href="/home" className="block px-3 pt-3 pb-6 mb-2">
          <span
            className="text-[32px] font-normal tracking-tight text-gray-900 block leading-none"
            style={{ fontFamily: "'Grand Hotel', cursive, sans-serif" }}
          >
            Shnik
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/home' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-4 px-3 py-3 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? 'font-bold text-black'
                    : 'font-normal text-gray-900 hover:bg-[#F2F2F2]'
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform group-hover:scale-105 ${
                    isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
                <span className="text-[15px]">{item.label}</span>
              </Link>
            );
          })}

          {/* Profile link */}
          {user && (
            <Link
              href={`/profile/${user.username}`}
              className={`flex items-center gap-4 px-3 py-3 rounded-lg text-sm transition-all group ${
                pathname === `/profile/${user.username}`
                  ? 'font-bold text-black'
                  : 'font-normal text-gray-900 hover:bg-[#F2F2F2]'
              }`}
            >
              <div
                className={`rounded-full p-[1px] ${
                  pathname === `/profile/${user.username}`
                    ? 'ring-2 ring-black'
                    : ''
                }`}
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="xs"
                />
              </div>
              <span className="text-[15px]">Profile</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Bottom Area: Logout */}
      <div className="pt-2 border-t border-[#EFEFEF]">
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-3 text-sm text-gray-700 hover:text-red-600 transition-colors py-2 px-3 w-full rounded-lg hover:bg-[#FAFAFA]"
        >
          <LogOut className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[14px]">Log Out</span>
        </button>
      </div>
    </aside>
  );
}

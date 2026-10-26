'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Heart, MessageCircle } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-12 md:pb-0">
        {/* Mobile Top Header (Instagram mobile exact design) */}
        <header className="md:hidden flex items-center justify-between px-4 h-[44px] border-b border-[#DBDBDB] bg-white sticky top-0 z-20">
          <Link href="/home" className="flex items-center">
            <span
              className="text-[26px] font-normal tracking-tight text-gray-900 block leading-none"
              style={{ fontFamily: "'Grand Hotel', cursive, sans-serif" }}
            >
              Shnik
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/notifications" className="text-gray-900">
              <Heart className="w-6 h-6 stroke-[1.8]" />
            </Link>
            <Link href="/messages" className="text-gray-900">
              <MessageCircle className="w-6 h-6 stroke-[1.8]" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full">{children}</main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}

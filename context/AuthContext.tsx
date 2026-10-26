'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { mockStore } from '@/lib/mockStore';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isMock: boolean;
  login: (usernameOrEmail: string, password?: string) => Promise<void>;
  signup: (data: { username: string; full_name: string; email: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const refreshUser = useCallback(async () => {
    if (isMock) {
      const current = mockStore.getCurrentUser();
      setUser(current);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(profile || null);
    } catch (err) {
      console.warn('Error fetching Supabase user, using fallback', err);
      setUser(mockStore.getCurrentUser());
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    refreshUser();

    if (isMock) {
      const unsubscribe = mockStore.subscribe(() => {
        const u = mockStore.getCurrentUser();
        setUser(u);
      });
      return () => unsubscribe();
    }
  }, [isMock, refreshUser]);

  const login = async (usernameOrEmail: string, password?: string) => {
    setLoading(true);
    try {
      if (isMock) {
        const loggedIn = mockStore.login(usernameOrEmail, password);
        setUser(loggedIn);
      } else {
        const supabase = createClient();
        let email = usernameOrEmail.trim();

        // If user entered a username instead of an email, resolve it
        if (!email.includes('@')) {
          try {
            const res = await fetch('/api/auth/resolve-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: email }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.email) {
                email = data.email;
              }
            }
          } catch (resErr) {
            console.warn('Could not resolve username to email:', resErr);
          }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: password || '',
        });
        if (error) throw error;
        await refreshUser();
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: { username: string; full_name: string; email: string; password?: string }) => {
    setLoading(true);
    try {
      if (isMock) {
        const newUser = mockStore.signUp({
          username: data.username,
          full_name: data.full_name,
          email: data.email,
          password: data.password,
        });
        setUser(newUser);
      } else {
        const supabase = createClient();
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password || 'SecurePassword123!',
          options: {
            data: {
              username: data.username.toLowerCase(),
              full_name: data.full_name,
            },
          },
        });
        if (error) throw error;
        if (authData.user) {
          await refreshUser();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isMock) {
        mockStore.logout();
        setUser(null);
      } else {
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isMock,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.push('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid username or password.';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect username or password. Please verify and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 max-w-[350px] mx-auto">
      {/* Main Login Card */}
      <div className="bg-white border border-[#DBDBDB] p-8 sm:p-10 text-center rounded-sm">
        <h1
          className="text-[44px] font-normal tracking-tight text-gray-900 mb-8 block leading-none select-none"
          style={{ fontFamily: "'Grand Hotel', cursive, sans-serif" }}
        >
          Shnik
        </h1>

        {error && (
          <div className="mb-4 p-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded leading-relaxed text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            required
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-2.5 py-2 text-xs bg-[#FAFAFA] border border-[#DBDBDB] rounded focus:outline-none focus:border-gray-400 placeholder-gray-400"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-2.5 py-2 text-xs bg-[#FAFAFA] border border-[#DBDBDB] rounded focus:outline-none focus:border-gray-400 placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-1.5 mt-2 rounded text-sm font-semibold text-white bg-[#0095F6] hover:bg-[#1877F2] active:opacity-70 transition disabled:opacity-50"
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>

      {/* Switch to Sign up Box */}
      <div className="bg-white border border-[#DBDBDB] p-5 text-center text-sm text-gray-800 rounded-sm">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold text-[#0095F6] hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

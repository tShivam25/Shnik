'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters (letters, numbers, underscores, dots).');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signup({
        username: cleanUsername,
        full_name: fullName.trim(),
        password,
      });
      router.push('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try a different username.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 max-w-[350px] mx-auto">
      {/* Main Sign up Card (Exact Instagram style) */}
      <div className="bg-white border border-[#DBDBDB] p-8 sm:p-10 text-center rounded-sm">
        <h1
          className="text-[44px] font-normal tracking-tight text-gray-900 mb-3 block leading-none select-none"
          style={{ fontFamily: "'Grand Hotel', cursive, sans-serif" }}
        >
          Shnik
        </h1>

        <p className="font-semibold text-gray-500 text-sm mb-5 leading-snug">
          Sign up to see photos and videos from your friends.
        </p>

        {error && (
          <div className="mb-4 p-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            className="w-full px-2.5 py-2 text-xs bg-[#FAFAFA] border border-[#DBDBDB] rounded focus:outline-none focus:border-gray-400 placeholder-gray-400"
          />

          <input
            type="text"
            required
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            placeholder="Username"
            className="w-full px-2.5 py-2 text-xs bg-[#FAFAFA] border border-[#DBDBDB] rounded focus:outline-none focus:border-gray-400 placeholder-gray-400"
          />

          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-2.5 py-2 text-xs bg-[#FAFAFA] border border-[#DBDBDB] rounded focus:outline-none focus:border-gray-400 placeholder-gray-400"
          />

          <p className="text-[11px] text-gray-400 my-3 leading-tight">
            By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-1.5 rounded text-sm font-semibold text-white bg-[#0095F6] hover:bg-[#1877F2] active:opacity-70 transition disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>

      {/* Switch to Log in Box */}
      <div className="bg-white border border-[#DBDBDB] p-5 text-center text-sm text-gray-800 rounded-sm">
        Have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-[#0095F6] hover:underline"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

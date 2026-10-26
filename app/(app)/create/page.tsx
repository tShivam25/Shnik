'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { mockStore } from '@/lib/mockStore';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setError('Please provide an image URL');
      return;
    }
    if (!user) {
      setError('You must be signed in to create a post');
      return;
    }

    setSharing(true);
    try {
      mockStore.createPost({
        image_url: imageUrl.trim(),
        caption: caption.trim(),
      });
      router.push('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish post';
      setError(msg);
      setSharing(false);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto py-8 px-4">
      <div className="bg-white border border-[#DBDBDB] rounded-xl overflow-hidden shadow-card">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#DBDBDB] flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-900 hover:opacity-60"
          >
            <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          <h1 className="font-semibold text-sm text-gray-900">Create new post</h1>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sharing || !imageUrl.trim()}
            className="text-sm font-semibold text-[#0095F6] hover:text-[#1877F2] disabled:opacity-40"
          >
            {sharing ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image URL input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Photo URL
            </label>
            <input
              type="url"
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste photo link (e.g. from Unsplash or image host)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DBDBDB] focus:outline-none focus:border-black"
            />
          </div>

          {/* Photo Preview Box */}
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#FAFAFA] border border-dashed border-[#DBDBDB] flex items-center justify-center relative">
            {imageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl.trim()}
                alt="Post Preview"
                className="w-full h-full object-cover"
                onError={() => {
                  setError('Could not load image from this URL. Please verify the link.');
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 p-6 text-center">
                <ImageIcon className="w-12 h-12 stroke-[1.2]" />
                <span className="text-xs">Photo preview will appear here</span>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Caption
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DBDBDB] focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={sharing || !imageUrl.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0095F6] hover:bg-[#1877F2] transition disabled:opacity-40"
          >
            {sharing ? 'Sharing post...' : 'Share to Shnik'}
          </button>
        </form>
      </div>
    </div>
  );
}

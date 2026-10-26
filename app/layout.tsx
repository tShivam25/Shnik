import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { QuSecBridgeProvider } from '@/components/QuSecBridgeProvider';

export const metadata: Metadata = {
  title: 'Shnik',
  description: 'Share photos, connect with friends, and send secure direct messages on Shnik.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white text-gray-900">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Grand Hotel / Dancing Script font for Instagram-style Shnik logo typography */}
        <link
          href="https://fonts.googleapis.com/css2?family=Grand+Hotel&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* QuSec Web Bridge Runtime */}
        <script src="/qusec-web-bridge.js" async />
      </head>
      <body className="h-full bg-white antialiased overflow-x-hidden selection:bg-pink-100">
        <AuthProvider>
          <QuSecBridgeProvider>{children}</QuSecBridgeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

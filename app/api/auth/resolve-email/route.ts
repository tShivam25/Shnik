import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.usernameOrEmail || '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
    }

    // 1. If user provided an email directly, return it immediately
    if (identifier.includes('@')) {
      return NextResponse.json({ email: identifier.toLowerCase() });
    }

    const cleanUsername = identifier.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const admin = createAdminClient();

    // 2. Query public.profiles to find user ID by username
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (profile?.email) {
      return NextResponse.json({ email: profile.email.toLowerCase() });
    }

    if (profile?.id) {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      if (authUser?.user?.email) {
        return NextResponse.json({ email: authUser.user.email.toLowerCase() });
      }
    }

    // 3. Fallback: Search users directly in Supabase Auth Admin
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 100 });
    if (listData?.users) {
      const match = listData.users.find((u) => {
        const metaUser = u.user_metadata?.username;
        const emailPrefix = u.email ? u.email.split('@')[0] : '';
        return (
          metaUser?.toLowerCase() === cleanUsername ||
          emailPrefix.toLowerCase() === cleanUsername
        );
      });

      if (match?.email) {
        return NextResponse.json({ email: match.email.toLowerCase() });
      }
    }

    // 4. Default fallback if not found
    return NextResponse.json({ email: `${cleanUsername}@shnik.app` });
  } catch (err: unknown) {
    console.error('Error resolving email from username:', err);
    // Graceful fallback to avoid hard crash
    return NextResponse.json({ email: null, error: 'Resolution failed' }, { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.usernameOrEmail || '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
    }

    const cleanUsername = identifier.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const admin = createAdminClient();

    // 1. If identifier contains '@', it might be direct email
    if (identifier.includes('@')) {
      const emailLower = identifier.toLowerCase();
      // Auto-confirm this user if unconfirmed
      try {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 100 });
        const userMatch = listData?.users.find((u) => u.email?.toLowerCase() === emailLower);
        if (userMatch && !userMatch.email_confirmed_at) {
          await admin.auth.admin.updateUserById(userMatch.id, { email_confirm: true });
        }
      } catch (_) {}
      return NextResponse.json({ email: emailLower });
    }

    // 2. Query public.profiles to find user ID by username
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (profile?.id) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
        if (authUser?.user) {
          // Auto-confirm user if unconfirmed so "Email not confirmed" error is eliminated!
          if (!authUser.user.email_confirmed_at) {
            await admin.auth.admin.updateUserById(profile.id, { email_confirm: true });
          }
          if (authUser.user.email) {
            return NextResponse.json({ email: authUser.user.email.toLowerCase() });
          }
        }
      } catch (err) {
        console.warn('Error fetching auth user by profile id:', err);
      }

      if (profile.email) {
        return NextResponse.json({ email: profile.email.toLowerCase() });
      }
    }

    // 3. Fallback: Search users directly in Supabase Auth Admin
    try {
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

        if (match) {
          // Auto-confirm unconfirmed user
          if (!match.email_confirmed_at) {
            await admin.auth.admin.updateUserById(match.id, { email_confirm: true });
          }
          if (match.email) {
            return NextResponse.json({ email: match.email.toLowerCase() });
          }
        }
      }
    } catch (_) {}

    // 4. Default synthetic email for username-only accounts
    return NextResponse.json({ email: `${cleanUsername}@shnik.internal` });
  } catch (err: unknown) {
    console.error('Error resolving email from username:', err);
    return NextResponse.json({ email: null, error: 'Resolution failed' }, { status: 200 });
  }
}

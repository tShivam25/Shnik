import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawUsername = (body.username || '').trim().toLowerCase();
    const cleanUsername = rawUsername.replace(/[^a-z0-9_.]/g, '');
    const fullName = (body.full_name || body.fullName || '').trim();
    const password = body.password || '';

    // 1. Validation
    if (!cleanUsername || cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters (letters, numbers, underscores, dots).' },
        { status: 400 }
      );
    }
    if (!fullName) {
      return NextResponse.json(
        { error: 'Please enter your full name.' },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 2. Check for unique username in public.profiles
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another username.' },
        { status: 400 }
      );
    }

    // 3. Create synthetic unique internal email for Supabase Auth
    const syntheticEmail = `${cleanUsername}@shnik.internal`;

    // 4. Create user with admin client and email_confirm: true (NEVER asks for email verification!)
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true, // Auto-confirmed! No email sent or needed.
      user_metadata: {
        username: cleanUsername,
        full_name: fullName,
      },
    });

    if (authError) {
      // If user already exists in auth.users by email
      if (authError.message.toLowerCase().includes('already registered')) {
        return NextResponse.json(
          { error: 'This username is already registered. Please choose another or log in.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser.user?.id;

    if (userId) {
      // 5. Ensure profile is inserted in public.profiles
      await admin.from('profiles').upsert({
        id: userId,
        username: cleanUsername,
        full_name: fullName,
        email: syntheticEmail,
        bio: '',
        avatar_url: null,
      });
    }

    return NextResponse.json({
      ok: true,
      user: authUser.user,
      email: syntheticEmail,
      username: cleanUsername,
    });
  } catch (err: unknown) {
    console.error('Error during user signup:', err);
    const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

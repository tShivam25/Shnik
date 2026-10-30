import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, text, forceFailure } = body;

    if (!from || !to || !text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields (from, to, text)' }, { status: 400 });
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isMock) {
      // Return success for mock mode - client handles simulated gateway progression
      const mockId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return NextResponse.json({
        ok: true,
        mock: true,
        message: {
          id: mockId,
          sender_id: from,
          recipient_id: to,
          body: text,
          status: 'in_transit',
          verified: null,
          session_id: `q-sess-${Date.now().toString(36)}`,
          created_at: new Date().toISOString(),
          stage: 'encoding',
        },
      });
    }

    // Authenticated Supabase flow
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify sender
    const senderId = user ? user.id : from;

    // Forward to Python QuSec Gateway if configured
    const gatewayUrl = process.env.QUSEC_SENDER_URL;
    const gatewayToken = process.env.QUSEC_TOKEN || '';
    const isLiveGateway = !!gatewayUrl && !gatewayUrl.includes('placeholder') && !gatewayUrl.includes('localhost:8000');

    // Insert message into DB. If no external gateway webhook is configured, mark as 'delivered' so recipient RLS allows reading.
    const initialStatus = isLiveGateway ? 'in_transit' : 'delivered';

    const admin = createAdminClient();
    const { data: insertedMessage, error: insertError } = await admin
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: to,
        body: text,
        status: initialStatus,
        verified: initialStatus === 'delivered' ? true : null,
        session_id: `q-sess-${Date.now().toString(36)}`,
      })
      .select('*')
      .single();

    if (insertError || !insertedMessage) {
      console.error('Failed to insert message:', insertError);
      return NextResponse.json({ error: 'Database error creating message' }, { status: 500 });
    }

    if (isLiveGateway) {
      try {
        const gwRes = await fetch(gatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-qusec-token': gatewayToken,
          },
          body: JSON.stringify({
            id: insertedMessage.id,
            from: senderId,
            to,
            message: text,
            text,
            mode: 'teleportation',
            forceFailure: !!forceFailure,
          }),
        });

        if (!gwRes.ok) {
          console.warn('Gateway returned non-OK status:', gwRes.status);
        }
      } catch (gwErr) {
        console.warn('Gateway transmission attempt error:', gwErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: insertedMessage,
    });
  } catch (error: unknown) {
    console.error('Send message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

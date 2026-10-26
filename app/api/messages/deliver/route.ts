import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.QUSEC_TOKEN || 'qusec_secure_gateway_token_dev';
    const receivedToken = req.headers.get('x-qusec-token');

    // Token validation
    if (!receivedToken || (receivedToken !== expectedToken && process.env.NEXT_PUBLIC_MOCK !== 'true')) {
      return NextResponse.json({ error: 'Unauthorized: invalid x-qusec-token header' }, { status: 401 });
    }

    const body = await req.json();
    const { id, text, verified } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing message id' }, { status: 400 });
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isMock) {
      return NextResponse.json({
        ok: true,
        delivered: true,
        verified: !!verified,
        mock: true,
      });
    }

    const admin = createAdminClient();
    const updateData: Record<string, unknown> = {
      status: verified ? 'delivered' : 'failed',
      verified: !!verified,
    };

    if (text) {
      updateData.body = text;
    }

    const { data: updatedMessage, error } = await admin
      .from('messages')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating delivered message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      delivered: true,
      message: updatedMessage,
    });
  } catch (error: unknown) {
    console.error('Deliver message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

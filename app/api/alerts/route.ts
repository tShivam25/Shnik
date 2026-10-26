import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.QUSEC_TOKEN || 'qusec_secure_gateway_token_dev';
    const receivedToken = req.headers.get('x-qusec-token');

    // Token validation (relaxed in mock mode)
    if (!receivedToken && process.env.NEXT_PUBLIC_MOCK !== 'true') {
      return NextResponse.json({ error: 'Unauthorized: missing x-qusec-token header' }, { status: 401 });
    }

    const body = await req.json();
    const { reason, severity, message_id, user_ids } = body;

    if (!reason || !severity) {
      return NextResponse.json({ error: 'Missing reason or severity' }, { status: 400 });
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isMock) {
      const mockAlert = {
        id: `alert-${Date.now()}`,
        user_ids: user_ids || [],
        reason,
        severity,
        message_id: message_id || null,
        created_at: new Date().toISOString(),
      };
      return NextResponse.json({ ok: true, alert: mockAlert, mock: true });
    }

    const admin = createAdminClient();
    const { data: alert, error } = await admin
      .from('alerts')
      .insert({
        user_ids: user_ids || [],
        reason,
        severity: severity === 'critical' ? 'critical' : 'warning',
        message_id: message_id || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Alert insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alert });
  } catch (error: unknown) {
    console.error('Create alert error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isMock) {
      return NextResponse.json({ alerts: [] });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ alerts: [] });
    }

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .contains('user_ids', [user.id])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

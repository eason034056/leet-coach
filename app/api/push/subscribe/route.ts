import { NextResponse } from 'next/server';
import { supabaseRoute } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json(); // { endpoint, keys: { p256dh, auth } }
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { error } = await supabase.from('push_subscriptions').insert({ user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  if (error && !error.message.includes('duplicate')) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}



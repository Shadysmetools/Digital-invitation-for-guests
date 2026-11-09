import { NextResponse } from 'next/server';
import { countReplies } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** Called once a day by Vercel Cron so the free database is never paused for inactivity. */
export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  await countReplies();
  return NextResponse.json({ ok: true });
}

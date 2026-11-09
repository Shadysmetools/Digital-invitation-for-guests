import { NextResponse } from 'next/server';
import { clientIp, deadlinePassed, getReplyByToken, getSettings, rateLimited, updateReply } from '@/lib/store';

export async function PATCH(request, { params }) {
  if (rateLimited(`patch:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'busy' }, { status: 429 });
  }
  const { token } = await params;
  const reply = await getReplyByToken(token);
  if (!reply) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const settings = await getSettings();
  if (deadlinePassed(settings)) return NextResponse.json({ error: 'closed' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (typeof body?.attending !== 'boolean') return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const attending = body.attending;
  const party = attending ? Number(body.party) : 0;
  if (attending && !(Number.isInteger(party) && party >= 1 && party <= settings.maxParty)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const next = await updateReply(reply, { attending, party });
  return NextResponse.json({ attending: next.attending, party: next.party });
}

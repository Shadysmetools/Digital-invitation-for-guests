import { NextResponse } from 'next/server';
import { clientIp, deadlinePassed, getReplyByToken, getSettings, rateLimited, setCompanions, updateReply } from '@/lib/store';
import { withUniqueWelcome } from '@/lib/welcome';
import { buildCompanions, keepSlots, parseGuestNames, publicCompanions } from '@/lib/companions';

export async function PATCH(request, { params }) {
  if (await rateLimited(`patch:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
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
  const next = attending === reply.attending && reply.welcome
    ? await updateReply(reply, { attending, party })
    : await withUniqueWelcome({ name: reply.name, lang: reply.lang, attending }, (welcome) =>
        updateReply(reply, { attending, party, welcome }),
      );
  const slots = attending ? parseGuestNames(body.guestNames, party) : [];
  let companions = slots ? null : keepSlots(reply.companions, party);
  if (slots) {
    try {
      companions = await buildCompanions(slots, reply.companions ?? [], reply.lang);
    } catch (err) {
      console.error('companions failed', err?.message);
      companions = keepSlots(reply.companions, party);
    }
  }
  await setCompanions(reply.id, companions);
  return NextResponse.json({ attending: next.attending, party: next.party, welcome: next.welcome, companions: publicCompanions(companions) });
}

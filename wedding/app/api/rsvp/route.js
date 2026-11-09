import { NextResponse } from 'next/server';
import { clientIp, createReply, deadlinePassed, getSettings, rateLimited } from '@/lib/store';

const fail = (error, status) => NextResponse.json({ error }, { status });

function parseAnswer(body, maxParty) {
  const attending = body?.attending === true;
  const party = attending ? Number(body?.party) : 0;
  if (typeof body?.attending !== 'boolean') return null;
  if (attending && !(Number.isInteger(party) && party >= 1 && party <= maxParty)) return null;
  return { attending, party };
}

export async function POST(request) {
  if (rateLimited(`rsvp:${clientIp(request)}`, 12, 10 * 60 * 1000)) return fail('busy', 429);
  const body = await request.json().catch(() => null);
  if (body?.website) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const name = typeof body?.name === 'string' ? body.name.replace(/[\u0000-\u001f\u007f]/g, '').trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || name.length > 80) return fail('invalid', 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('invalid', 400);

  const settings = await getSettings();
  if (deadlinePassed(settings)) return fail('closed', 403);
  const answer = parseAnswer(body, settings.maxParty);
  if (!answer) return fail('invalid', 400);

  const lang = body.lang === 'ar' ? 'ar' : 'en';
  const reply = await createReply({ name, email, lang, ...answer });
  if (!reply) return fail('exists', 409);
  return NextResponse.json({ token: reply.token });
}

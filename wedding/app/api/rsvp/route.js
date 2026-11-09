import { NextResponse } from 'next/server';
import { clientIp, countReplies, createReply, deadlinePassed, getSettings, MAX_REPLIES, rateLimited, replyExists } from '@/lib/store';
import { normalizePhone } from '@/lib/phone';
import { withUniqueWelcome } from '@/lib/welcome';

const fail = (error, status) => NextResponse.json({ error }, { status });

function parseAnswer(body, maxParty) {
  const attending = body?.attending === true;
  const party = attending ? Number(body?.party) : 0;
  if (typeof body?.attending !== 'boolean') return null;
  if (attending && !(Number.isInteger(party) && party >= 1 && party <= maxParty)) return null;
  return { attending, party };
}

export async function POST(request) {
  const perVisitor = Number(process.env.RSVP_IP_LIMIT) || 15;
  if (await rateLimited(`rsvp:${clientIp(request)}`, perVisitor, 10 * 60 * 1000)) return fail('busy', 429);
  const body = await request.json().catch(() => null);
  if (body?.website) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const name = typeof body?.name === 'string' ? body.name.replace(/[\u0000-\u001f\u007f]/g, '').trim() : '';
  // `email` holds the guest's contact: an email address, or a phone number in international digits.
  const raw = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const isEmail = raw.includes('@');
  const email = isEmail ? raw : normalizePhone(raw) ?? '';
  if (!name || name.length > 80) return fail('invalid', 400);
  if (!email || email.length > 254 || (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return fail('invalid', 400);

  const settings = await getSettings();
  if (deadlinePassed(settings)) return fail('closed', 403);
  const answer = parseAnswer(body, settings.maxParty);
  if (!answer) return fail('invalid', 400);

  const lang = body.lang === 'ar' ? 'ar' : 'en';
  if (await replyExists(email)) return fail('exists', 409);
  if ((await countReplies()) >= MAX_REPLIES) return fail('closed', 403);
  if (await rateLimited('rsvp-total', 700, 24 * 60 * 60 * 1000)) return fail('busy', 429);
  const reply = await withUniqueWelcome({ name, lang, attending: answer.attending }, (welcome) =>
    createReply({ name, email, lang, welcome, ...answer }),
  );
  if (!reply) return fail('exists', 409);
  return NextResponse.json({ token: reply.token });
}

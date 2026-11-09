import { NextResponse } from 'next/server';
import { COOKIE, isAdmin, passwordMatches, sessionValue } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';
import { clientIp, rateLimited, removeQuestion, removeReply, saveSettings } from '@/lib/store';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanSettings(b) {
  const mapUrl = text(b.mapUrl, 500);
  const maxParty = Number(b.maxParty);
  const time = text(b.time, 5);
  const deadline = text(b.deadline, 10);
  return {
    time: /^\d{2}:\d{2}$/.test(time) ? time : '',
    venue: text(b.venue, 200),
    mapUrl: mapUrl.startsWith('https://') ? mapUrl : '',
    dressCode: text(b.dressCode, 300),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : '',
    note: text(b.note, 1500),
    maxParty: Number.isInteger(maxParty) && maxParty >= 1 && maxParty <= 10 ? maxParty : 4,
    assistantName: text(b.assistantName, 60) || 'Rehana',
    whatsapp: normalizePhone(text(b.whatsapp, 24)) ?? '',
    persona: text(b.persona, 1500),
  };
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (body?.action === 'login') {
    if (await rateLimited(`login:${clientIp(request)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'busy' }, { status: 429 });
    }
    if (!passwordMatches(body.password)) return NextResponse.json({ error: 'wrong' }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, sessionValue(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 60 });
    return res;
  }

  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (body?.action === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE);
    return res;
  }
  if (body?.action === 'settings') await saveSettings(cleanSettings(body.settings ?? {}));
  else if (body?.action === 'removeReply') await removeReply(String(body.id));
  else if (body?.action === 'removeQuestion') await removeQuestion(String(body.id));
  else return NextResponse.json({ error: 'invalid' }, { status: 400 });
  return NextResponse.json({ ok: true });
}

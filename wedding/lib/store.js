import { createHash, randomBytes } from 'node:crypto';
import { del, get, list, put } from '@vercel/blob';

const sha = (s) => createHash('sha256').update(s).digest('hex');

async function read(path) {
  const r = await get(path, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text());
}

function write(path, value, allowOverwrite = true) {
  return put(path, JSON.stringify(value), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite,
    contentType: 'application/json',
  });
}

async function readAll(prefix) {
  const paths = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    paths.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const items = await Promise.all(paths.map(read));
  return items.filter(Boolean);
}

export const DEFAULT_SETTINGS = {
  time: '',
  venue: '',
  mapUrl: '',
  dressCode: '',
  deadline: '',
  note: '',
  maxParty: 4,
  assistantName: 'Rehana',
  persona: `Your name is Rehana (ريحانة in Arabic). You are the host of this wedding: warm, joyful and gracious, like a much-loved member of the family welcoming guests at the door. Never pushy.
In English, be elegant and friendly. In Arabic, use natural, respectful Egyptian dialect.
Show real happiness for Shady and Hana, and make every guest feel expected and wanted. Keep it short, with at most one emoji, only when it feels natural.`,
};

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await read('settings.json')) };
}

export function saveSettings(settings) {
  return write('settings.json', settings);
}

/** Creates a reply. Returns null when this email has already replied. */
export async function createReply({ name, email, attending, party, lang }) {
  const id = sha(email);
  const now = new Date().toISOString();
  const token = randomBytes(24).toString('base64url');
  const reply = { id, token, name, email, attending, party, lang, createdAt: now, updatedAt: now };
  try {
    await write(`replies/${id}.json`, reply, false);
  } catch (err) {
    if (await read(`replies/${id}.json`)) return null;
    throw err;
  }
  await write(`tokens/${sha(token)}.json`, { id });
  return reply;
}

export async function getReplyByToken(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 64) return null;
  const ref = await read(`tokens/${sha(token)}.json`);
  return ref ? read(`replies/${ref.id}.json`) : null;
}

export async function updateReply(reply, changes) {
  const next = { ...reply, ...changes, updatedAt: new Date().toISOString() };
  await write(`replies/${reply.id}.json`, next);
  return next;
}

export async function listReplies() {
  const replies = await readAll('replies/');
  return replies.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function removeReply(id) {
  if (!/^[a-f0-9]{64}$/.test(id)) return;
  const reply = await read(`replies/${id}.json`);
  if (!reply) return;
  await del([`replies/${id}.json`, `tokens/${sha(reply.token)}.json`]);
}

export function addQuestion(question) {
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  return write(`questions/${id}.json`, { id, question, at: new Date().toISOString() });
}

export async function listQuestions() {
  const items = await readAll('questions/');
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export async function removeQuestion(id) {
  if (/^[0-9]+-[a-f0-9]{8}$/.test(id)) await del(`questions/${id}.json`);
}

const CHAT_PER_MINUTE = 6;
const CHAT_PER_VISITOR_DAY = 30;
const CHAT_PER_DAY_TOTAL = 300;

/** Durable assistant limits: per visitor per minute and day, and a total daily cap. */
export async function allowChat(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const visitorPath = `usage/${day}/${sha(ip).slice(0, 32)}.json`;
  const totalPath = `usage/${day}.json`;
  const [visitor, total] = await Promise.all([read(visitorPath), read(totalPath)]);
  const now = Date.now();
  const recent = (visitor?.recent ?? []).filter((t) => now - t < 60 * 1000);
  const count = visitor?.count ?? 0;
  const totalCount = total?.count ?? 0;
  if (recent.length >= CHAT_PER_MINUTE || count >= CHAT_PER_VISITOR_DAY || totalCount >= CHAT_PER_DAY_TOTAL) return false;
  await Promise.all([
    write(visitorPath, { count: count + 1, recent: [...recent, now] }),
    write(totalPath, { count: totalCount + 1 }),
  ]);
  return true;
}

const hits = new Map();

/** Per-instance limiter: a first line of defence against bursts. */
export function rateLimited(key, limit, windowMs) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

export function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function deadlinePassed(settings) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.deadline)) return false;
  return Date.now() > Date.parse(`${settings.deadline}T23:59:59+02:00`);
}

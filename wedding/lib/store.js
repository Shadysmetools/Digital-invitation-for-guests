import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const sha = (s) => createHash('sha256').update(s).digest('hex');

let client;
function db() {
  client ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
  return client;
}

function must({ data, error }) {
  if (error) throw error;
  return data;
}

export const MAX_REPLIES = 400;

export const DEFAULT_SETTINGS = {
  time: '',
  venue: '',
  mapUrl: '',
  dressCode: '',
  deadline: '',
  note: '',
  maxParty: 4,
  whatsapp: '',
  assistantName: 'Rehana',
  persona: `Your name is Rehana (ريحانة in Arabic). You are the host of this wedding: warm, joyful and gracious, like a much-loved member of the family welcoming guests at the door. Never pushy.
In English, be elegant and friendly. In Arabic, use natural, respectful Egyptian dialect.
Show real happiness for Shady and Hana, and make every guest feel expected and wanted. Keep it short, with at most one emoji, only when it feels natural.`,
};

const fromRow = (r) => ({
  id: r.id,
  token: r.token,
  name: r.name,
  email: r.email,
  attending: r.attending,
  party: r.party,
  lang: r.lang,
  welcome: r.welcome,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const isConflict = (error, column) => error?.code === '23505' && error.message.includes(column);

function welcomeTaken() {
  return Object.assign(new Error('welcome line already used'), { code: 'WELCOME_TAKEN' });
}

let settingsCache = null;

export async function getSettings() {
  if (settingsCache && Date.now() - settingsCache.at < 15000) return settingsCache.value;
  const row = must(await db().from('settings').select('data').eq('id', 1).maybeSingle());
  const value = { ...DEFAULT_SETTINGS, ...row?.data };
  settingsCache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(settings) {
  must(await db().from('settings').upsert({ id: 1, data: settings }));
  settingsCache = null;
}

export async function replyExists(email) {
  return !!must(await db().from('replies').select('id').eq('id', sha(email)).maybeSingle());
}

export async function countReplies() {
  const { count, error } = await db().from('replies').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

/** Creates a reply. Returns null when this email or phone has already replied. */
export async function createReply({ name, email, attending, party, lang, welcome }) {
  const token = randomBytes(24).toString('base64url');
  const { data, error } = await db()
    .from('replies')
    .insert({ id: sha(email), token, token_hash: sha(token), name, email, attending, party, lang, welcome })
    .select()
    .single();
  if (isConflict(error, 'replies_pkey')) return null;
  if (isConflict(error, 'welcome')) throw welcomeTaken();
  if (error) throw error;
  return fromRow(data);
}

export async function getReplyByToken(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 64) return null;
  const row = must(await db().from('replies').select('*').eq('token_hash', sha(token)).maybeSingle());
  return row ? fromRow(row) : null;
}

export async function updateReply(reply, { attending = reply.attending, party = reply.party, welcome = reply.welcome }) {
  const { data, error } = await db()
    .from('replies')
    .update({ attending, party, welcome, updated_at: new Date().toISOString() })
    .eq('id', reply.id)
    .select()
    .single();
  if (isConflict(error, 'welcome')) throw welcomeTaken();
  if (error) throw error;
  return fromRow(data);
}

export async function listReplies() {
  const rows = must(await db().from('replies').select('*').order('created_at', { ascending: false }));
  return rows.map(fromRow);
}

export async function listWelcomes() {
  const rows = must(await db().from('replies').select('welcome').not('welcome', 'is', null));
  return rows.map((r) => r.welcome);
}

export async function removeReply(id) {
  if (/^[a-f0-9]{64}$/.test(id)) must(await db().from('replies').delete().eq('id', id));
}

export async function addQuestion(question) {
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  must(await db().from('questions').insert({ id, question }));
}

export async function listQuestions() {
  const rows = must(await db().from('questions').select('*').order('at', { ascending: false }));
  return rows.map((r) => ({ id: r.id, question: r.question, at: r.at }));
}

export async function removeQuestion(id) {
  if (/^[0-9]+-[a-f0-9]{8}$/.test(id)) must(await db().from('questions').delete().eq('id', id));
}

/** Durable, atomic limiter shared by every server. If the check fails, the request is refused. */
export async function rateLimited(key, limit, windowMs) {
  const { data, error } = await db().rpc('rate_hit', {
    p_key: sha(key).slice(0, 40),
    p_limit: limit,
    p_window: Math.round(windowMs / 1000),
  });
  if (error) {
    console.error('rate limit check failed', error.message);
    return true;
  }
  return data !== true;
}

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** Assistant limits: per visitor per minute and day, then a total daily cap. */
export async function allowChat(ip) {
  if (await rateLimited(`chat-minute:${ip}`, 6, MINUTE)) return false;
  if (await rateLimited(`chat-day:${ip}`, 40, DAY)) return false;
  return !(await rateLimited('chat-total', 300, DAY));
}

/** Caps AI card lines per day; past this, cards use the hand-written pool. */
export async function allowCardMessage() {
  return !(await rateLimited('card-total', 500, DAY));
}

export function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function deadlinePassed(settings) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.deadline)) return false;
  return Date.now() > Date.parse(`${settings.deadline}T23:59:59+02:00`);
}

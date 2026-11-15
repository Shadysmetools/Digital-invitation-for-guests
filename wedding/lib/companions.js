import { createHash, randomBytes } from 'node:crypto';
import { listWelcomes } from '@/lib/store';
import { createWelcome, fallbackWelcome } from '@/lib/welcome';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const AI_LINES = 4; // past this, companion lines come from the hand-written pool so replies stay quick

export const MAX_COMPANIONS = 20;

const cleanName = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) : '');

/** Names by slot (slot 0 is the first extra guest); empty strings mark slots left blank. */
export function parseGuestNames(value, party) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, Math.min(Math.max(0, party - 1), MAX_COMPANIONS)).map(cleanName);
}

/** What the main guest's page may see about their companions. */
export const publicCompanions = (list) => (list ?? []).map(({ slot, name, welcome, token }) => ({ slot, name, welcome, token }));

/**
 * Builds the companion list for these slots. A companion whose slot and name are unchanged keeps
 * their card; a renamed slot keeps its link but gets a fresh line; new names get a new card.
 */
export async function buildCompanions(slots, existing, lang) {
  const used = await listWelcomes();
  const out = [];
  let ai = 0;
  for (let slot = 0; slot < slots.length; slot++) {
    const name = slots[slot];
    if (!name) continue;
    const prev = existing.find((c) => c.slot === slot);
    if (prev && prev.name === name) {
      out.push(prev);
      continue;
    }
    const guest = { name, lang, attending: true };
    let welcome = null;
    try {
      welcome = ai++ < AI_LINES ? await createWelcome(guest, used) : fallbackWelcome(lang, true, used, name);
    } catch (err) {
      console.error('companion line failed', err?.message);
      welcome = fallbackWelcome(lang, true, used, name);
    }
    if (welcome) used.push(welcome);
    const token = prev?.token ?? randomBytes(24).toString('base64url');
    out.push({ slot, name, welcome, token, tokenHash: sha(token) });
  }
  return out;
}

/** Companions kept when the guest changes only the number of people. */
export const keepSlots = (existing, party) => (existing ?? []).filter((c) => c.slot < party - 1);

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'wedding_dashboard';

const digest = (value) => createHmac('sha256', process.env.DASHBOARD_PASSWORD ?? '').update(value).digest();

function same(a, b) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionValue() {
  return digest('dashboard-session').toString('hex');
}

export function passwordMatches(password) {
  if (!process.env.DASHBOARD_PASSWORD || typeof password !== 'string') return false;
  return same(digest(password), digest(process.env.DASHBOARD_PASSWORD));
}

export async function isAdmin() {
  if (!process.env.DASHBOARD_PASSWORD) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && same(Buffer.from(value), Buffer.from(sessionValue()));
}

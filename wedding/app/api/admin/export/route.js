import { isAdmin } from '@/lib/auth';
import { listReplies } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Quotes each cell and neutralises values a spreadsheet would run as a formula.
function cell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 });
  const origin = new URL(request.url).origin;
  const rows = (await listReplies()).map((r) =>
    [r.name, r.email, r.attending ? 'Coming' : 'Not coming', r.party, r.createdAt, r.updatedAt, `${origin}/i/${r.token}`].map(cell).join(','),
  );
  const header = ['Name', 'Email or phone', 'Reply', 'People', 'Replied at', 'Updated at', 'Private link'].map(cell).join(',');
  return new Response(`﻿${[header, ...rows].join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="wedding-replies.csv"',
    },
  });
}

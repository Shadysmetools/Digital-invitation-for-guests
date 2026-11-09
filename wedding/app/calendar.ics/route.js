import { icsFile } from '@/lib/calendar';
import { getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(icsFile(await getSettings()), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="shady-and-hana-wedding.ics"',
    },
  });
}

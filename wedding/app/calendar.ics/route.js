import { icsFile } from '@/lib/calendar';
import { getEvent } from '@/lib/events';
import { getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const event = getEvent(new URL(request.url).searchParams.get('event'));
  return new Response(icsFile(await getSettings(), event), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="shady-and-hana-${event.key}.ics"`,
    },
  });
}

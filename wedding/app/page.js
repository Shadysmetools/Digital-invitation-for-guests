import Invitation from '@/components/Invitation';
import { deadlinePassed, getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const settings = await getSettings();
  const { time, venue, mapUrl, dressCode, deadline, note, maxParty, assistantName, whatsapp } = settings;
  return (
    <Invitation
      facts={{ time, venue, mapUrl, dressCode, deadline, note, maxParty, assistantName, whatsapp }}
      closed={deadlinePassed(settings)}
      assistant={process.env.ASSISTANT_ENABLED === '1'}
    />
  );
}

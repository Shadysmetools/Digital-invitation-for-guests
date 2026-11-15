import Invitation from '@/components/Invitation';
import { getEvent } from '@/lib/events';
import { deadlinePassed, getSettings } from '@/lib/store';

export default async function EventPage({ eventKey }) {
  const settings = await getSettings();
  const { venue, mapUrl, dressCode, deadline, maxParty, assistantName, whatsapp } = settings;
  const { key, time, video, poster, en, ar } = getEvent(eventKey);
  return (
    <Invitation
      event={{ key, time, video, poster, en, ar }}
      facts={{ venue, mapUrl, dressCode, deadline, maxParty, assistantName, whatsapp }}
      closed={deadlinePassed(settings)}
      assistant={process.env.ASSISTANT_ENABLED === '1'}
    />
  );
}

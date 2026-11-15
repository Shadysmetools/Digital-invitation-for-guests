import { notFound } from 'next/navigation';
import PrivateCard from '@/components/PrivateCard';
import { googleCalendarUrl } from '@/lib/calendar';
import { getEvent } from '@/lib/events';
import { getCompanionByToken, getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your invitation · Shady & Hana', robots: { index: false, follow: false } };

/** A card for a guest someone else named when replying. It shows only the card. */
export default async function Page({ params }) {
  const { token } = await params;
  const guest = await getCompanionByToken(token);
  if (!guest) notFound();
  const settings = await getSettings();
  const event = getEvent(guest.event);
  const { key, en, ar } = event;
  return (
    <PrivateCard
      companion
      event={{ key, en, ar }}
      guest={{ name: guest.name, attending: true, party: 1, lang: guest.lang, welcome: guest.welcome }}
      maxParty={1}
      closed
      googleUrl={googleCalendarUrl(settings, event)}
    />
  );
}

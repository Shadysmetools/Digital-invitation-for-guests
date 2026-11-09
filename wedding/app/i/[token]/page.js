import { notFound } from 'next/navigation';
import PrivateCard from '@/components/PrivateCard';
import { googleCalendarUrl } from '@/lib/calendar';
import { deadlinePassed, getReplyByToken, getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your invitation · Shady & Hana', robots: { index: false, follow: false } };

export default async function Page({ params }) {
  const { token } = await params;
  const reply = await getReplyByToken(token);
  if (!reply) notFound();
  const settings = await getSettings();
  return (
    <PrivateCard
      token={token}
      guest={{ name: reply.name, attending: reply.attending, party: reply.party, lang: reply.lang }}
      maxParty={settings.maxParty}
      closed={deadlinePassed(settings)}
      googleUrl={googleCalendarUrl(settings)}
    />
  );
}

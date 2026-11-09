import { notFound } from 'next/navigation';
import PrivateCard from '@/components/PrivateCard';
import { googleCalendarUrl } from '@/lib/calendar';
import { deadlinePassed, getReplyByToken, getSettings, updateReply } from '@/lib/store';
import { withUniqueWelcome } from '@/lib/welcome';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your invitation · Shady & Hana', robots: { index: false, follow: false } };

export default async function Page({ params }) {
  const { token } = await params;
  let reply = await getReplyByToken(token);
  if (!reply) notFound();
  if (!reply.welcome) {
    const current = reply;
    reply = await withUniqueWelcome(current, (welcome) => updateReply(current, { welcome }));
  }
  const settings = await getSettings();
  return (
    <PrivateCard
      token={token}
      guest={{ name: reply.name, attending: reply.attending, party: reply.party, lang: reply.lang, welcome: reply.welcome }}
      maxParty={settings.maxParty}
      closed={deadlinePassed(settings)}
      googleUrl={googleCalendarUrl(settings)}
    />
  );
}

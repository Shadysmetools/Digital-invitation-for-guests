import EventPage from '@/components/EventPage';
import { eventMetadata } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const metadata = eventMetadata('katb');

export default function Page() {
  return <EventPage eventKey="katb" />;
}

import EventPage from '@/components/EventPage';
import { eventMetadata } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const metadata = eventMetadata('wedding');

export default function Page() {
  return <EventPage eventKey="wedding" />;
}

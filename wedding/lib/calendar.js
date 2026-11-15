import { eventStart } from '@/lib/events';

const pad = (n) => String(n).padStart(2, '0');

function stamp(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
}

function range(event) {
  const start = new Date(eventStart(event));
  const end = new Date(start.getTime() + event.hours * 3600 * 1000);
  return { start: stamp(start), end: stamp(end) };
}

const location = (settings) => settings.venue || 'Villa Mit Rehan';

export function googleCalendarUrl(settings, event) {
  const { start, end } = range(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.en.title,
    dates: `${start}/${end}`,
    location: location(settings),
    ctz: 'Africa/Cairo',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeIcs = (s) => s.replace(/([\;,])/g, '\$1').replace(/\n/g, '\n');

export function icsFile(settings, event) {
  const { start, end } = range(event);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shady and Hana//Wedding//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.key}-shady-hana-20261218@invitation`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.en.title)}`,
    `LOCATION:${escapeIcs(location(settings))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

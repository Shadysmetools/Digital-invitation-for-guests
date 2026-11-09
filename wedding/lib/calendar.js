const TITLE = 'Wedding of Shady & Hana';
const pad = (n) => String(n).padStart(2, '0');

function stamp(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
}

/** Cairo is UTC+2 on 18 December. Without a time the event is all-day. */
function range(settings) {
  const match = /^(\d{2}):(\d{2})$/.exec(settings.time);
  if (!match) return { allDay: true, start: '20261218', end: '20261219' };
  const start = new Date(Date.UTC(2026, 11, 18, Number(match[1]) - 2, Number(match[2])));
  const end = new Date(start.getTime() + 5 * 3600 * 1000);
  return { allDay: false, start: stamp(start), end: stamp(end) };
}

const location = (settings) => settings.venue || 'Mit Rehan';

export function googleCalendarUrl(settings) {
  const { start, end } = range(settings);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: TITLE,
    dates: `${start}/${end}`,
    location: location(settings),
    ctz: 'Africa/Cairo',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeIcs = (s) => s.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');

export function icsFile(settings) {
  const { allDay, start, end } = range(settings);
  const value = allDay ? ';VALUE=DATE' : '';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shady and Hana//Wedding//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:wedding-shady-hana-20261218@invitation',
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART${value}:${start}`,
    `DTEND${value}:${end}`,
    `SUMMARY:${escapeIcs(TITLE)}`,
    `LOCATION:${escapeIcs(location(settings))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

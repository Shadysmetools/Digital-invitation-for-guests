/** The two celebrations on 18 December 2026, both at Villa Mit Rehan. Cairo is UTC+2 in December. */
export const EVENTS = {
  katb: {
    key: 'katb',
    time: '16:00',
    hours: 2,
    video: '/katb.mp4',
    poster: '/katb-poster.jpg',
    og: '/og-katb.jpg',
    path: '/katb',
    en: { label: 'Katb el-Kitab', title: 'The Katb el-Kitab of Shady & Hana', time: '4:00 PM' },
    ar: { label: 'كتب الكتاب', title: 'كتب كتاب شادي وهنا', time: '٤:٠٠ مساءً' },
  },
  wedding: {
    key: 'wedding',
    time: '17:30',
    hours: 5,
    video: '/wedding.mp4',
    poster: '/wedding-poster.jpg',
    og: '/og-wedding.jpg',
    path: '/wedding',
    en: { label: 'Wedding', title: 'The Wedding of Shady & Hana', time: '5:30 PM' },
    ar: { label: 'حفل الزفاف', title: 'فرح شادي وهنا', time: '٥:٣٠ مساءً' },
  },
};

export const eventKey = (value) => (value === 'katb' ? 'katb' : 'wedding');
export const getEvent = (value) => EVENTS[eventKey(value)];

/** Start time in milliseconds since the epoch. */
export function eventStart(event) {
  const [h, m] = event.time.split(':').map(Number);
  return Date.UTC(2026, 11, 18, h - 2, m);
}

export function eventMetadata(key) {
  const event = getEvent(key);
  const description = `Friday 18 December 2026 · ${event.en.time} · Villa Mit Rehan`;
  return {
    title: event.en.title,
    description,
    openGraph: {
      title: event.en.title,
      description,
      type: 'website',
      url: event.path,
      images: [{ url: event.og, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [event.og] },
  };
}

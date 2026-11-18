/** The two celebrations on 18 December 2026, both at Villa Mit Rehan. Cairo is UTC+2 in December. */
export const EVENTS = {
  katb: {
    key: 'katb',
    time: '16:00',
    hours: 2,
    video: '/katb.mp4',
    frames: { dir: '/frames/katb/', count: 166 },
    music: '/katb-music.m4a',
    poster: '/katb-poster.jpg',
    og: '/og-katb-v3.jpg',
    path: '/katb',
    en: { label: 'Katb el-Kitab', waName: 'Katb el-Kitab', title: 'The Katb el-Kitab of Shady & Hana', time: '4:00 PM', short: '4:00 pm' },
    ar: { label: 'كتب الكتاب', waName: 'كتب كتاب شادي وهنا', title: 'كتب كتاب شادي وهنا', time: '٤:٠٠ مساءً', short: '٤:٠٠ م' },
  },
  wedding: {
    key: 'wedding',
    time: '17:30',
    hours: 5,
    video: '/wedding.mp4',
    frames: { dir: '/frames/wedding/', count: 166 },
    music: '/wedding-music.m4a',
    poster: '/wedding-poster.jpg',
    og: '/og-wedding-v3.jpg',
    path: '/wedding',
    en: { label: 'Wedding', waName: 'Wedding', title: 'The Wedding of Shady & Hana', time: '5:30 PM', short: '5:30 pm' },
    ar: { label: 'حفل الزفاف', waName: 'فرح شادي وهنا', title: 'فرح شادي وهنا', time: '٥:٣٠ مساءً', short: '٥:٣٠ م' },
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
      siteName: 'Shady & Hana',
      images: [{ url: event.og, width: 1200, height: 630, type: 'image/jpeg', alt: event.en.title }],
    },
    twitter: { card: 'summary_large_image', images: [event.og] },
  };
}

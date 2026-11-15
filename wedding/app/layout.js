import { Allura, Amiri, Aref_Ruqaa, Caveat, Cormorant_Garamond, Jost, Noto_Sans_Arabic } from 'next/font/google';
import { eventMetadata } from '@/lib/events';
import './globals.css';

const script = Allura({ weight: '400', subsets: ['latin'], variable: '--f-script' });
const serif = Cormorant_Garamond({ weight: ['400', '500', '600'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--f-serif' });
const sans = Jost({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--f-sans' });
const hand = Caveat({ weight: ['500', '600'], subsets: ['latin'], variable: '--f-hand' });
const arabicSans = Noto_Sans_Arabic({ weight: ['400', '500', '600'], subsets: ['arabic'], variable: '--f-arabic-sans' });
const arabic = Amiri({ weight: ['400', '700'], subsets: ['arabic'], variable: '--f-arabic' });
const arabicScript = Aref_Ruqaa({ weight: ['400', '700'], subsets: ['arabic'], variable: '--f-arabic-script' });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shady-hana-wedding.vercel.app'),
  ...eventMetadata('wedding'),
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ead3bf' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${script.variable} ${serif.variable} ${sans.variable} ${hand.variable} ${arabic.variable} ${arabicSans.variable} ${arabicScript.variable}`}>
      <body>{children}</body>
    </html>
  );
}

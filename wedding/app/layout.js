import { Allura, Amiri, Aref_Ruqaa, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const script = Allura({ weight: '400', subsets: ['latin'], variable: '--f-script' });
const serif = Cormorant_Garamond({ weight: ['400', '500', '600'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--f-serif' });
const arabic = Amiri({ weight: ['400', '700'], subsets: ['arabic'], variable: '--f-arabic' });
const arabicScript = Aref_Ruqaa({ weight: ['400', '700'], subsets: ['arabic'], variable: '--f-arabic-script' });

const description = '18 December 2026 · Mit Rehan';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shady-hana-wedding.vercel.app'),
  title: 'The Wedding of Shady & Hana',
  description,
  openGraph: {
    title: 'The Wedding of Shady & Hana',
    description,
    type: 'website',
    images: [{ url: '/og-invitation.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-invitation.jpg'] },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#581119' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${script.variable} ${serif.variable} ${arabic.variable} ${arabicScript.variable}`}>
      <body>{children}</body>
    </html>
  );
}

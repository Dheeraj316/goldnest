import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600', '700'], display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Goldnest Admin', template: '%s | Goldnest Admin' },
  description: 'Internal operations console for Goldnest branches, staff, customers and configuration.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}

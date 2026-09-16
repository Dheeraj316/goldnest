import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Apple, PlayCircle, Smartphone } from 'lucide-react';

export const metadata: Metadata = { title: 'Download the App' };

export default function DownloadPage() {
  return (
    <>
      <PageHero
        eyebrow="Mobile app"
        title="Goldnest, in your pocket"
        description="Apply, track appraisal status, manage repayments and view your loan history — all from the app."
      />

      <section className="py-20">
        <div className="container-page max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
            <Smartphone size={34} />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold text-ink">Coming soon to app stores</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-light">
            The Goldnest customer app is in active development and will be available on the App Store and Google
            Play once it&apos;s completed testing and our licensing/compliance review is finalised. Get in touch and
            we&apos;ll notify you the moment it&apos;s live.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <span className="flex cursor-not-allowed items-center gap-2 rounded-full border border-navy-900/15 px-5 py-3 text-sm font-semibold text-ink-light opacity-60">
              <Apple size={18} /> App Store — coming soon
            </span>
            <span className="flex cursor-not-allowed items-center gap-2 rounded-full border border-navy-900/15 px-5 py-3 text-sm font-semibold text-ink-light opacity-60">
              <PlayCircle size={18} /> Google Play — coming soon
            </span>
          </div>

          <Link href="/contact" className="btn-primary mt-10 inline-flex">
            Ask us to notify you
          </Link>
        </div>
      </section>
    </>
  );
}

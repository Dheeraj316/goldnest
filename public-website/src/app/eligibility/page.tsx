import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { eligibility } from '@/lib/content';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = { title: 'Eligibility' };

export default function EligibilityPage() {
  return (
    <>
      <PageHero eyebrow="Before you apply" title="Eligibility" description="A quick check before you book an appraisal." />

      <section className="py-20">
        <div className="container-page max-w-2xl">
          <div className="space-y-4">
            {eligibility.map((item) => (
              <div key={item.label} className="flex items-start gap-4 rounded-xl2 border border-gold-100 bg-white p-5 shadow-soft">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-gold-500" />
                <div>
                  <h3 className="font-semibold text-ink">{item.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-light">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm leading-relaxed text-ink-light">
            Eligibility rules — including any customer or branch-level limits — are configured centrally and
            may be refined over time. If you&apos;re unsure whether you qualify, the fastest way to find out is to start
            an application; nothing is charged or committed until you accept a final offer.
          </p>

          <Link href="/branch-locator" className="btn-primary mt-8">
            Book an appraisal <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}

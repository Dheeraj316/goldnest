import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';
import { GoldCalculator } from '@/components/GoldCalculator';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = { title: 'Gold Loan' };

const HIGHLIGHTS = [
  'Loan-to-value set by current, admin-configured policy — shown to you before you commit',
  'Interest calculated transparently — flat or reducing balance, disclosed upfront',
  'Your gold weighed, tested and valued item-by-item in front of you',
  'Sealed, photographed and vaulted with a trackable packet ID',
  'Flexible repayment: interest-only, part-payment, or early closure where permitted',
  'Renewal options before maturity, subject to product terms',
];

export default function GoldLoanPage() {
  return (
    <>
      <PageHero
        eyebrow="Product"
        title="Gold Loan"
        description="Unlock funds against your gold jewellery — quickly appraised, fairly valued, and safely held until you're ready to reclaim it."
      />

      <section className="py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <SectionHeading eyebrow="What you get" title="A loan structured around clarity" />
            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-gold-500" />
                  <span className="text-sm leading-relaxed text-ink-light">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/branch-locator" className="btn-primary">
                Book an appraisal <ArrowRight size={16} />
              </Link>
              <Link href="/eligibility" className="btn-secondary">
                Check eligibility
              </Link>
            </div>
          </div>

          <GoldCalculator />
        </div>
      </section>

      <section className="bg-gold-50/60 py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Good to know" title="Labelled clearly, every step" align="center" />
          <div className="mx-auto mt-10 max-w-3xl rounded-xl2 border border-gold-200 bg-white p-8 text-sm leading-relaxed text-ink-light shadow-soft">
            <p>
              Every figure you see before appraisal — on this page, in the calculator, or in the app — is
              clearly marked as an <strong className="text-ink">indicative estimate</strong>. Your actual loan amount,
              interest rate, applicable fees and LTV are confirmed only after your gold is physically appraised at a
              branch and your application passes KYC and credit/policy checks. Nothing is auto-approved, and no
              amount is ever assumed from a client app — every number is calculated and verified on our servers.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

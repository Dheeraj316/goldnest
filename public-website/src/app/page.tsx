import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Vault, Timer, SlidersHorizontal, ArrowRight, FileCheck2, Gem, Landmark, BadgeCheck } from 'lucide-react';
import { GoldCalculator } from '@/components/GoldCalculator';
import { SectionHeading } from '@/components/SectionHeading';
import { Faq } from '@/components/Faq';
import { homeFaqs } from '@/lib/content';
import { IMAGES } from '@/lib/images';

const TRUST_POINTS = [
  { icon: Vault, title: 'Bank-grade vault storage', description: 'Your gold is sealed, photographed and logged into a tracked vault the moment it’s received.' },
  { icon: SlidersHorizontal, title: 'Transparent, configurable pricing', description: 'Interest, fees and LTV are set by policy — not negotiated case-by-case — and shown to you upfront.' },
  { icon: Timer, title: 'Same-day appraisal', description: 'Walk in with your gold and an appointment, walk out with a clear, itemised valuation.' },
  { icon: ShieldCheck, title: 'Built for compliance', description: 'Architected around KYC/AML, audit trails and maker-checker controls from day one.' },
];

const STEPS = [
  { title: 'Apply online or via app', description: 'Tell us how much you need and pick a branch — takes under two minutes.' },
  { title: 'Complete KYC', description: 'Upload your ID and address proof securely; we mask and encrypt sensitive data.' },
  { title: 'Get your gold appraised', description: 'Visit your chosen branch — our appraiser values each item in front of you.' },
  { title: 'Approval & agreement', description: 'Review the exact loan amount, rate and terms before you sign anything.' },
  { title: 'Disbursement', description: 'Funds move to your bank account; your gold moves to the vault.' },
];

const FEATURES = [
  { icon: Gem, title: 'Fair, itemised valuation', description: 'Every piece is weighed, tested for purity and valued individually — you see the breakdown, not just a total.' },
  { icon: FileCheck2, title: 'Minimal paperwork', description: 'Digital KYC and e-agreements mean less waiting in a branch.' },
  { icon: Landmark, title: 'Multiple repayment options', description: 'Pay interest monthly, part-pay principal, or close the loan early — your choice, clearly costed.' },
  { icon: BadgeCheck, title: 'Full traceability', description: 'From the moment your gold is received to the moment it’s released, every movement is logged.' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <Image
            src={IMAGES.heroGoldBars}
            alt=""
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/85 to-navy-950" />
        </div>
        <div className="absolute inset-0 bg-gold-radial" aria-hidden="true" />
        <div className="container-page relative grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <span className="eyebrow text-gold-300">Secured lending, made transparent</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
              Loans against your gold, <span className="text-gold-300">valued fairly</span> and vaulted safely.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/65">
              Goldnest turns your gold jewellery into funds you can use today — with clear pricing, itemised
              appraisal, and your gold tracked in a secure vault from the moment it arrives until the day you take it
              back.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/gold-loan" className="btn-primary">
                Explore Gold Loans <ArrowRight size={16} />
              </Link>
              <Link href="/branch-locator" className="btn-ghost-dark">
                Find a branch
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-xl2 border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <p className="eyebrow text-gold-300">Indicative, today</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <MiniStat label="Typical LTV" value="Up to 75%*" />
                <MiniStat label="Interest from" value="~12%* p.a." />
                <MiniStat label="Appraisal time" value="Same visit" />
                <MiniStat label="Disbursal" value="To your bank a/c" />
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-white/40">
                *Illustrative figures. Actual LTV and rate are set by branch appraisal and current product
                configuration — see{' '}
                <Link href="/interest-charges" className="underline decoration-white/30 underline-offset-2">
                  Interest &amp; Charges
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-gold-100 bg-white">
        <div className="container-page grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <div key={point.title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                <point.icon size={20} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="How it works"
            title="From application to funds, in five clear steps"
            description="No hidden stages, no surprise approvals — you can track exactly where your application stands at every point."
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative rounded-xl2 border border-gold-100 bg-white p-6 shadow-soft">
                <span className="font-display text-3xl font-semibold text-gold-200">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-light">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="bg-gold-50/60 py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeading
            eyebrow="Plan ahead"
            title="See what your gold could be worth"
            description="Use the calculator to get a same-page estimate. Your real loan amount is confirmed after a branch appraisal, using whatever LTV, rate and fee structure is live in our system at the time."
          />
          <GoldCalculator />
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Why Goldnest" title="Designed around trust, not just speed" align="center" />
          <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4 rounded-xl2 border border-gold-100 bg-white p-6 shadow-soft">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                  <feature.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="bg-white py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="Questions" title="Frequently asked" description="Can't find what you're looking for?" />
          <div>
            <Faq items={homeFaqs} />
            <Link href="/faq" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 hover:text-gold-700">
              View all FAQs <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy-950 py-20 text-white">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to see what your gold is worth?</h2>
          <p className="max-w-lg text-white/60">Book a branch appointment or start your application from the app — no commitment until you approve the final offer.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/branch-locator" className="btn-primary">Book an appointment</Link>
            <Link href="/download" className="btn-ghost-dark">Download the app</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

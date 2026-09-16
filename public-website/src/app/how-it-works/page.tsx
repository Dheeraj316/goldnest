import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'How It Works' };

const STAGES = [
  {
    title: 'Application submitted',
    description: 'You apply through the app — mobile number, requested amount, tenure and preferred branch.',
  },
  { title: 'KYC verification', description: 'Your identity and address documents are checked against our records.' },
  { title: 'Appointment & gold submission', description: 'You visit your chosen branch and hand over your gold for appraisal.' },
  { title: 'Gold appraisal', description: 'An authorised appraiser weighs, tests purity and values each item — subject to a second-person check.' },
  { title: 'Credit / policy check', description: 'Your application is checked against current product rules and any risk flags.' },
  { title: 'Loan approved', description: 'A branch manager or higher authority approves within their configured limit.' },
  { title: 'Agreement signed', description: 'You review and accept the final loan terms — amount, rate, tenure, charges.' },
  { title: 'Loan disbursed', description: 'Funds are transferred to your bank account; your gold moves into the vault.' },
  { title: 'Active & repayment', description: 'Track your outstanding balance, due dates and payment history in the app.' },
  { title: 'Closed', description: 'Repay in full and your gold is released back to you, tracked the whole way.' },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="Process"
        title="How a Goldnest loan works, start to finish"
        description="Every application moves through the same tracked stages — you can see exactly where yours stands at any time in the app."
      />

      <section className="py-20">
        <div className="container-page max-w-3xl">
          <ol className="relative space-y-10 border-l border-gold-200 pl-8">
            {STAGES.map((stage, index) => (
              <li key={stage.title} className="relative">
                <span className="absolute -left-[calc(2rem+9px)] flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-gold-500 bg-cream-100 text-[10px] font-bold text-gold-600">
                  {index + 1}
                </span>
                <h3 className="font-display text-lg font-semibold text-ink">{stage.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{stage.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

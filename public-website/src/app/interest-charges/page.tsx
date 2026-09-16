import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = { title: 'Interest & Charges' };

const CHARGE_TYPES = [
  { name: 'Interest', description: 'Charged on your principal outstanding — flat or reducing-balance methodology, accrued daily or monthly depending on product configuration.' },
  { name: 'Processing fee', description: 'A one-time fee at disbursement, calculated as a flat amount or percentage of the loan.' },
  { name: 'Valuation / appraisal fee', description: 'Where applicable, charged for the appraisal of your gold.' },
  { name: 'Penal charges', description: 'Apply only on overdue amounts, after any configured grace period — never on a loan in good standing.' },
  { name: 'Renewal / closure charges', description: 'Where applicable, disclosed before you choose to renew or close early.' },
];

export default function InterestChargesPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Interest & charges"
        description="Every charge that can apply to your loan, explained — and none of it hidden until the agreement stage."
      />

      <section className="py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading eyebrow="What can apply" title="Charge types" />
            <div className="mt-8 space-y-5">
              {CHARGE_TYPES.map((c) => (
                <div key={c.name} className="rounded-xl2 border border-gold-100 bg-white p-5 shadow-soft">
                  <h3 className="font-semibold text-ink">{c.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl2 border border-gold-200 bg-gold-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-gold-600" />
                <div>
                  <h3 className="font-semibold text-ink">Rates and limits are configured, not fixed in this page</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-light">
                    Interest rate, maximum LTV, fee amounts, tenure limits and grace periods are set by our
                    product configuration and can change over time or by loan product — they are never
                    hard-coded into the application. The exact figures for your loan are shown in the app before
                    you apply, and again in your loan agreement before you sign.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl2 border border-navy-900/10 bg-white p-6 shadow-soft">
              <h3 className="font-semibold text-ink">No surprise charges</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-light">
                Any waiver, override, or adjustment to a fee or valuation on your loan requires a second,
                different authorised employee to approve it — the same maker-checker control that governs
                every sensitive change in our system. Nothing is silently added to your balance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { LegalNotice } from '@/components/LegalNotice';
import { COMPANY } from '@/lib/config';
import { Mail, Phone, Clock3 } from 'lucide-react';

export const metadata: Metadata = { title: 'Grievance Redressal' };

const STEPS = [
  { step: '1. Raise it in-app', detail: 'Open a support ticket from your loan or account — it routes directly to your branch and is tracked with a ticket ID.' },
  { step: '2. Branch response', detail: 'Your branch will acknowledge and work to resolve your concern within the SLA shown on your ticket.' },
  { step: '3. Escalate', detail: `If unresolved, escalate to our Grievance Officer at ${COMPANY.grievanceEmail} with your ticket ID.` },
  { step: '4. Regulatory escalation', detail: 'If still unresolved within the applicable timeframe, you may escalate to the relevant regulatory authority once we are licensed — details will be published here.' },
];

export default function GrievancePage() {
  return (
    <>
      <PageHero eyebrow="Support" title="Grievance Redressal" description="How to raise a concern, and what happens next." />
      <section className="py-20">
        <div className="container-page max-w-3xl">
          <LegalNotice />

          <div className="space-y-5">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-xl2 border border-gold-100 bg-white p-5 shadow-soft">
                <h3 className="font-semibold text-ink">{s.step}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{s.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl2 border border-navy-900/10 bg-navy-950 p-6 text-white">
            <h3 className="font-display text-lg font-semibold">Grievance Officer</h3>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <p className="flex items-center gap-2">
                <Mail size={15} className="text-gold-300" /> {COMPANY.grievanceEmail}
              </p>
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-gold-300" /> {COMPANY.supportPhone}
              </p>
              <p className="flex items-center gap-2">
                <Clock3 size={15} className="text-gold-300" /> Response within our published SLA, shown on every ticket
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

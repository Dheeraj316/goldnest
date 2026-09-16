import { AlertTriangle } from 'lucide-react';

export function LegalNotice() {
  return (
    <div className="mb-10 flex items-start gap-3 rounded-xl2 border border-gold-300 bg-gold-50 p-5 text-sm leading-relaxed text-ink-light">
      <AlertTriangle size={19} className="mt-0.5 shrink-0 text-gold-600" />
      <p>
        <strong className="text-ink">Draft — pending legal review.</strong> This page is a working draft prepared
        for the Goldnest platform and has not been reviewed by qualified legal counsel. It must not be relied on as
        final or published to real customers until reviewed and approved by a lawyer familiar with applicable
        lending, KYC/AML and data-protection law.
      </p>
    </div>
  );
}

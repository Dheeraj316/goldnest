'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { renewLoanAction, type FormState } from '@/lib/actions/loans';
import { Drawer } from '@/components/Drawer';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Renewing…' : 'Settle & renew'}
    </button>
  );
}

export function RenewForm({
  loanId,
  interestOutstanding,
  chargesOutstanding,
  tenureDays,
}: {
  loanId: string;
  interestOutstanding: number;
  chargesOutstanding: number;
  tenureDays: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(renewLoanAction, initialState);
  const mustSettle = interestOutstanding + chargesOutstanding;


  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <RefreshCw size={13} /> Renew
      </button>

      {open && (
        <Drawer title="Renew loan" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="loanId" value={loanId} />
            <div className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-light">Interest outstanding</span><span>₹{interestOutstanding.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-ink-light">Charges outstanding</span><span>₹{chargesOutstanding.toFixed(2)}</span></div>
              <div className="mt-1.5 flex justify-between border-t border-gold-200 pt-1.5 font-semibold text-ink"><span>Must settle now</span><span>₹{mustSettle.toFixed(2)}</span></div>
              <p className="mt-2 text-xs text-ink-light/80">
                Principal is not paid here — it rolls into a fresh term under a new loan number. Anything paid above this amount reduces principal.
              </p>
            </div>
            <div>
              <label className="label">Amount collected (₹)</label>
              <input name="paymentAmount" type="number" min={mustSettle || 0.01} step="0.01" required defaultValue={mustSettle.toFixed(2)} className="input" />
            </div>
            <div>
              <label className="label">New tenure (days)</label>
              <input name="newTenureDays" type="number" min="1" max="3650" defaultValue={tenureDays} className="input" />
            </div>
            <div>
              <label className="label">Mode</label>
              <select name="paymentMode" required className="input" defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Remarks (optional)</label>
              <input name="remarks" className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

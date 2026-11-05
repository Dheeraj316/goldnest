'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { TrendingUp } from 'lucide-react';
import { topUpLoanAction, type FormState } from '@/lib/actions/loans';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-primary w-full">
      {pending ? 'Disbursing…' : 'Disburse top-up'}
    </button>
  );
}

export function TopUpForm({
  loanId,
  ltvPercent,
  outstandingPrincipal,
  items,
}: {
  loanId: string;
  ltvPercent: number;
  outstandingPrincipal: number;
  items: { netWeight: number; purityKarat: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [state, formAction] = useActionState(topUpLoanAction, initialState);

  useAutoClose(state.success, () => {
    setOpen(false);
    setRateInput('');
  });

  const rate = Number(rateInput) || 0;
  const totalNetWeight = items.reduce((s, i) => s + i.netWeight, 0);
  const valuation = items.reduce((s, i) => s + (i.netWeight * i.purityKarat) / 24 * rate, 0);
  const newEligible = (valuation * ltvPercent) / 100;
  const headroom = Math.max(newEligible - outstandingPrincipal, 0);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <TrendingUp size={13} /> Top up
      </button>

      {open && (
        <Drawer title="Top up loan" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="loanId" value={loanId} />
            <div className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-light">Pledged net weight</span><span>{totalNetWeight.toFixed(3)}g</span></div>
              <div className="flex justify-between"><span className="text-ink-light">Outstanding principal</span><span>{rupees(outstandingPrincipal)}</span></div>
              <p className="mt-2 text-xs text-ink-light/80">
                Re-values the same pledged gold at today&apos;s rate and disburses the gap above the outstanding principal. No new collateral, no new loan.
              </p>
            </div>
            <div>
              <label className="label">24k gold rate today (₹/gram)</label>
              <input
                name="goldRatePerGram"
                type="number"
                min="1"
                step="0.01"
                required
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="input"
              />
            </div>

            {rate > 0 && (
              <div className="rounded-lg bg-navy-900 px-4 py-3 text-sm text-white">
                <div className="flex justify-between py-0.5"><span>Re-valued pledge</span><span className="font-semibold text-gold-300">{rupees(valuation)}</span></div>
                <div className="flex justify-between py-0.5"><span>New eligible ({ltvPercent}% LTV)</span><span className="font-semibold text-gold-300">{rupees(newEligible)}</span></div>
                <div className="flex justify-between py-0.5"><span>Additional credit available</span><span className={`font-bold ${headroom > 0 ? 'text-emerald-400' : 'text-rose-300'}`}>{rupees(headroom)}</span></div>
              </div>
            )}

            <div>
              <label className="label">Amount to disburse (optional — defaults to the full headroom)</label>
              <input name="requestedAmount" type="number" min="1" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Remarks (optional)</label>
              <input name="remarks" className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton disabled={rate <= 0 || headroom <= 0} />
          </form>
        </Drawer>
      )}
    </>
  );
}

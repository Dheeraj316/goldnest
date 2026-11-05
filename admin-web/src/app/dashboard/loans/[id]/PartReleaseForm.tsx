'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { PackageOpen } from 'lucide-react';
import { partReleaseAction, type FormState } from '@/lib/actions/loans';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PledgedItem {
  id: string;
  itemType: string;
  netWeight: number;
  purityKarat: number;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-primary w-full">
      {pending ? 'Releasing…' : 'Release selected items'}
    </button>
  );
}

export function PartReleaseForm({
  loanId,
  ltvPercent,
  outstandingPrincipal,
  items,
}: {
  loanId: string;
  ltvPercent: number;
  outstandingPrincipal: number;
  items: PledgedItem[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rateInput, setRateInput] = useState('');
  const [state, formAction] = useActionState(partReleaseAction, initialState);

  useAutoClose(state.success, () => {
    setOpen(false);
    setSelected(new Set());
    setRateInput('');
  });

  const rate = Number(rateInput) || 0;
  const remaining = items.filter((i) => !selected.has(i.id));
  const remainingValuation = remaining.reduce((s, i) => s + (i.netWeight * i.purityKarat) / 24 * rate, 0);
  const remainingEligible = (remainingValuation * ltvPercent) / 100;
  const covers = remainingEligible >= outstandingPrincipal;
  const releasingEverything = selected.size === items.length;
  const canSubmit = selected.size > 0 && !releasingEverything && rate > 0 && covers;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <PackageOpen size={13} /> Release gold
      </button>

      {open && (
        <Drawer title="Release pledged gold" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="loanId" value={loanId} />
            <p className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-2.5 text-xs text-ink-light">
              Hands the selected items back to the customer while the loan stays open. Allowed only if the gold that stays pledged, re-valued at today&apos;s rate, still covers the outstanding principal ({rupees(outstandingPrincipal)}) at {ltvPercent}% LTV.
            </p>

            <div>
              <label className="label">Items to hand back</label>
              <div className="space-y-2">
                {items.map((i) => (
                  <label key={i.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gold-100 px-3.5 py-2.5 text-sm hover:bg-gold-50/50">
                    <input
                      type="checkbox"
                      name="itemIds"
                      value={i.id}
                      checked={selected.has(i.id)}
                      onChange={() => toggle(i.id)}
                      className="h-4 w-4 accent-[#B8862A]"
                    />
                    <span className="flex-1 font-medium text-ink">{i.itemType}</span>
                    <span className="text-ink-light">{i.netWeight}g · {i.purityKarat}K</span>
                  </label>
                ))}
              </div>
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

            {rate > 0 && selected.size > 0 && (
              <div className="rounded-lg bg-navy-900 px-4 py-3 text-sm text-white">
                <div className="flex justify-between py-0.5"><span>Gold staying pledged</span><span className="font-semibold text-gold-300">{remaining.length} item(s)</span></div>
                <div className="flex justify-between py-0.5"><span>Supports ({ltvPercent}% LTV)</span><span className="font-semibold text-gold-300">{rupees(remainingEligible)}</span></div>
                <div className="flex justify-between py-0.5"><span>Outstanding principal</span><span className="font-semibold text-gold-300">{rupees(outstandingPrincipal)}</span></div>
                <p className={`mt-1.5 text-xs font-semibold ${releasingEverything ? 'text-rose-300' : covers ? 'text-emerald-400' : 'text-rose-300'}`}>
                  {releasingEverything
                    ? 'Releasing everything is a loan closure — close the loan instead.'
                    : covers
                      ? 'Still fully secured — release allowed.'
                      : 'Would leave the loan under-secured — pay down principal or release fewer items.'}
                </p>
              </div>
            )}

            <div>
              <label className="label">Remarks (optional)</label>
              <input name="remarks" className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton disabled={!canSubmit} />
          </form>
        </Drawer>
      )}
    </>
  );
}

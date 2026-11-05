'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { recordPaymentAction, type FormState } from '@/lib/actions/loans';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Recording…' : 'Record payment'}
    </button>
  );
}

export function PaymentForm({ loanId }: { loanId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(recordPaymentAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <Plus size={13} /> Record payment
      </button>

      {open && (
        <Drawer title="Record a payment" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="loanId" value={loanId} />
            <p className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-2.5 text-xs text-ink-light">
              Applied automatically: interest first, then charges, then principal. Manual/cash only for now.
            </p>
            <div>
              <label className="label">Amount (₹)</label>
              <input name="amount" type="number" min="1" step="0.01" required className="input" />
            </div>
            <div>
              <label className="label">Mode</label>
              <select name="mode" required className="input" defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

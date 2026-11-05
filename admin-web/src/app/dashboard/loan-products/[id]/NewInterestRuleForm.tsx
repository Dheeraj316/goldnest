'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Pencil } from 'lucide-react';
import { addInterestRuleAction, type FormState } from '@/lib/actions/loan-products';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Saving…' : 'Set new rule'}
    </button>
  );
}

export function NewInterestRuleForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const action = addInterestRuleAction.bind(null, productId);
  const [state, formAction] = useActionState(action, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <Pencil size={13} /> New rule
      </button>

      {open && (
        <Drawer title="Set interest rule" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <p className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-2.5 text-xs text-ink-light">
              This closes out the current rule and opens a new one — existing loans keep the rate they were disbursed
              at, this only applies going forward.
            </p>
            <div>
              <label className="label">Method</label>
              <select name="method" required className="input" defaultValue="REDUCING_BALANCE">
                <option value="REDUCING_BALANCE">Reducing balance</option>
                <option value="FLAT">Flat</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Annual rate (%)</label>
                <input name="annualRatePercent" type="number" min="0" step="0.01" required defaultValue="12" className="input" />
              </div>
              <div>
                <label className="label">Penal rate (%)</label>
                <input name="penalRatePercent" type="number" min="0" step="0.01" defaultValue="2" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Accrual frequency</label>
                <select name="accrualFrequency" required className="input" defaultValue="DAILY">
                  <option value="DAILY">Daily</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className="label">Payment frequency</label>
                <select name="paymentFrequency" required className="input" defaultValue="MONTHLY">
                  <option value="MONTHLY">Monthly</option>
                  <option value="ON_CLOSURE">On closure</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

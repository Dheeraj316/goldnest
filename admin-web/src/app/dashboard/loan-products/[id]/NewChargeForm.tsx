'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { addChargeAction, type FormState } from '@/lib/actions/loan-products';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Adding…' : 'Add charge'}
    </button>
  );
}

export function NewChargeForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const action = addChargeAction.bind(null, productId);
  const [state, formAction] = useActionState(action, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <Plus size={13} /> New charge
      </button>

      {open && (
        <Drawer title="Add a charge" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label">Charge code</label>
              <input name="code" required placeholder="PROCESSING_FEE" className="input" />
            </div>
            <div>
              <label className="label">Charge name</label>
              <input name="name" required placeholder="Processing Fee" className="input" />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="calcType" required className="input" defaultValue="PERCENT_OF_PRINCIPAL">
                <option value="PERCENT_OF_PRINCIPAL">Percent of principal</option>
                <option value="FLAT">Flat amount</option>
              </select>
            </div>
            <div>
              <label className="label">Amount (₹ or %)</label>
              <input name="amount" type="number" min="0" step="0.01" required className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

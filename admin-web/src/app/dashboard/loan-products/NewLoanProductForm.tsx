'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { createLoanProductAction, type FormState } from '@/lib/actions/loan-products';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Creating…' : 'Create product'}
    </button>
  );
}

export function NewLoanProductForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createLoanProductAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> New product
      </button>

      {open && (
        <Drawer title="New loan product" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label">Product code</label>
              <input name="code" required placeholder="GL-PREMIUM" className="input" />
            </div>
            <div>
              <label className="label">Product name</label>
              <input name="name" required placeholder="Gold Loan Premium" className="input" />
            </div>
            <div>
              <label className="label">Max LTV (%)</label>
              <input name="maxLtvPercent" type="number" min="1" max="100" step="0.01" required defaultValue="75" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Min amount (₹)</label>
                <input name="minLoanAmount" type="number" min="0" required defaultValue="5000" className="input" />
              </div>
              <div>
                <label className="label">Max amount (₹)</label>
                <input name="maxLoanAmount" type="number" min="0" required defaultValue="2000000" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Min tenure (days)</label>
                <input name="minTenureDays" type="number" min="1" required defaultValue="30" className="input" />
              </div>
              <div>
                <label className="label">Max tenure (days)</label>
                <input name="maxTenureDays" type="number" min="1" required defaultValue="365" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Grace period (days)</label>
              <input name="gracePeriodDays" type="number" min="0" defaultValue="3" className="input" />
            </div>

            <p className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-2.5 text-xs text-ink-light">
              Interest rate and charges are set on the product detail page after creation. These terms are placeholders
              until reviewed and approved by legal/compliance for real use.
            </p>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

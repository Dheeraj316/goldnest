'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { createApplicationAction, type FormState } from '@/lib/actions/loans';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';
import type { Branch, Customer, LoanProduct } from '@/lib/types';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Submitting…' : 'Submit application'}
    </button>
  );
}

export function NewApplicationForm({ products, branches, customers }: { products: LoanProduct[]; branches: Branch[]; customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createApplicationAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> New application
      </button>

      {open && (
        <Drawer title="New loan application" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label">Customer</label>
              <select name="customerId" required className="input" defaultValue="">
                <option value="" disabled>Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName ?? ''} — {c.mobile}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Product</label>
              <select name="productId" required className="input" defaultValue="">
                <option value="" disabled>Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select name="branchId" required className="input" defaultValue="">
                <option value="" disabled>Select a branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Requested amount (₹)</label>
                <input name="requestedAmount" type="number" min="1" required className="input" />
              </div>
              <div>
                <label className="label">Tenure (days)</label>
                <input name="requestedTenureDays" type="number" min="1" required defaultValue="180" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Purpose (optional)</label>
              <input name="purpose" className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

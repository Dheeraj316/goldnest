'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { createBranchAction, type FormState } from '@/lib/actions/branches';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Creating…' : 'Create branch'}
    </button>
  );
}

export function NewBranchForm({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createBranchAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> New branch
      </button>

      {open && (
        <Drawer title="New branch" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="organizationId" value={organizationId} />

            <div>
              <label className="label">Branch code</label>
              <input name="code" required placeholder="BLR02" className="input" />
            </div>
            <div>
              <label className="label">Branch name</label>
              <input name="name" required placeholder="Jayanagar Branch" className="input" />
            </div>
            <div>
              <label className="label">Address line 1</label>
              <input name="addressLine1" required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">City</label>
                <input name="city" required className="input" />
              </div>
              <div>
                <label className="label">State</label>
                <input name="state" required className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">PIN code</label>
                <input name="pinCode" required pattern="\d{6}" className="input" />
              </div>
              <div>
                <label className="label">Cash limit (₹)</label>
                <input name="cashLimit" type="number" min="0" step="1000" defaultValue="0" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

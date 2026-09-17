'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { createEmployeeAction } from '@/lib/actions/employees';
import type { FormState } from '@/lib/actions/branches';
import type { Branch, Role } from '@/lib/types';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Creating…' : 'Create employee'}
    </button>
  );
}

export function NewEmployeeForm({ branches, roles }: { branches: Branch[]; roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createEmployeeAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> New employee
      </button>

      {open && (
        <Drawer title="New employee" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input name="firstName" required className="input" />
              </div>
              <div>
                <label className="label">Last name</label>
                <input name="lastName" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Mobile</label>
              <input name="mobile" required pattern="[6-9]\d{9}" placeholder="9876543210" className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" />
            </div>
            <div>
              <label className="label">Branch</label>
              <select name="branchId" required className="input">
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Role</label>
              <select name="roleId" required className="input">
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Initial password</label>
              <input name="initialPassword" type="text" required minLength={8} placeholder="Min. 8 characters" className="input" />
              <p className="mt-1 text-xs text-ink-light/60">Share this with the employee out-of-band — not over chat or email.</p>
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

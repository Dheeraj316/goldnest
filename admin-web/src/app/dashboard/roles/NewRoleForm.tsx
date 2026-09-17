'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { createRoleAction } from '@/lib/actions/roles';
import type { FormState } from '@/lib/actions/branches';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Creating…' : 'Create role'}
    </button>
  );
}

export function NewRoleForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createRoleAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> New role
      </button>

      {open && (
        <Drawer title="New role" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label">Role code</label>
              <input name="code" required placeholder="OPERATIONS_STAFF" className="input" />
              <p className="mt-1 text-xs text-ink-light/60">UPPER_SNAKE_CASE — spaces become underscores automatically.</p>
            </div>
            <div>
              <label className="label">Display name</label>
              <input name="name" required placeholder="Operations Staff" className="input" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" rows={3} className="input" />
            </div>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { requestSettingChangeAction } from '@/lib/actions/settings';
import type { FormState } from '@/lib/actions/branches';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Submitting…' : 'Submit for approval'}
    </button>
  );
}

export function NewSettingChangeForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(requestSettingChangeAction, initialState);

  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> Request change
      </button>

      {open && (
        <Drawer title="Request a configuration change" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label">Key</label>
              <input name="key" required placeholder="MAX_LTV_PERCENT" className="input" />
            </div>
            <div>
              <label className="label">Data type</label>
              <select name="dataType" required className="input">
                <option value="NUMBER">Number</option>
                <option value="STRING">String</option>
                <option value="BOOLEAN">Boolean</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <div>
              <label className="label">New value</label>
              <input name="value" required placeholder="75" className="input" />
            </div>
            <div>
              <label className="label">Description</label>
              <input name="description" placeholder="Maximum loan-to-value ratio" className="input" />
            </div>
            <div>
              <label className="label">Reason for this change</label>
              <textarea name="changeReason" rows={3} className="input" />
            </div>

            <p className="rounded-lg border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-xs leading-relaxed text-ink-light">
              This submits a request only — a <strong>different</strong> authorized user must approve it before the
              live value changes.
            </p>

            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

            <SubmitButton />
          </form>
        </Drawer>
      )}
    </>
  );
}

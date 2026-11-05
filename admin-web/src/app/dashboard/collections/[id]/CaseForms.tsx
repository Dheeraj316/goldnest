'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarClock, MessageSquarePlus, UserPlus } from 'lucide-react';
import { assignCaseAction, createPromiseAction, logActivityAction, type FormState } from '@/lib/actions/collections';
import { Drawer } from '@/components/Drawer';
import { useAutoClose } from '@/lib/useAutoClose';

const initialState: FormState = {};

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? busy : idle}
    </button>
  );
}

export function LogActivityForm({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(logActivityAction, initialState);
  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <MessageSquarePlus size={13} /> Log contact
      </button>
      {open && (
        <Drawer title="Log a contact attempt" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="caseId" value={caseId} />
            <div>
              <label className="label">Type</label>
              <select name="type" required defaultValue="CALL" className="input">
                <option value="CALL">Call</option>
                <option value="VISIT">Field visit</option>
                <option value="SMS">SMS</option>
                <option value="NOTICE">Notice sent</option>
                <option value="NOTE">Note</option>
              </select>
            </div>
            <div>
              <label className="label">Outcome</label>
              <select name="outcome" defaultValue="" className="input">
                <option value="">—</option>
                <option value="REACHED">Reached the customer</option>
                <option value="NO_ANSWER">No answer</option>
                <option value="REFUSED">Refused to pay</option>
                <option value="PROMISED">Promised to pay</option>
                <option value="WRONG_NUMBER">Wrong number</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" rows={4} maxLength={2000} className="input" />
            </div>
            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <Submit idle="Save" busy="Saving…" />
          </form>
        </Drawer>
      )}
    </>
  );
}

export function PromiseForm({ caseId, outstandingTotal }: { caseId: string; outstandingTotal: number | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createPromiseAction, initialState);
  useAutoClose(state.success, () => setOpen(false));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <CalendarClock size={13} /> Record promise
      </button>
      {open && (
        <Drawer title="Record a promise to pay" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="caseId" value={caseId} />
            <p className="rounded-lg border border-gold-200 bg-gold-50/60 px-3.5 py-2.5 text-xs text-ink-light">
              A new promise replaces any promise that is still pending. Once the date passes, the nightly sweep marks it kept if at least
              this much was received on the loan in that window, otherwise broken.
            </p>
            <div>
              <label className="label">Amount (₹){outstandingTotal != null ? ` — up to ₹${outstandingTotal.toLocaleString('en-IN')}` : ''}</label>
              <input name="promisedAmount" type="number" min="0.01" step="0.01" max={outstandingTotal ?? undefined} required className="input" />
            </div>
            <div>
              <label className="label">Promised by</label>
              <input name="promisedDate" type="date" min={today} required className="input" />
            </div>
            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <Submit idle="Record promise" busy="Saving…" />
          </form>
        </Drawer>
      )}
    </>
  );
}

export function AssignForm({ caseId, officers }: { caseId: string; officers: { id: string; firstName: string; lastName: string | null; employeeCode: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(assignCaseAction, initialState);
  useAutoClose(state.success, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <UserPlus size={13} /> Assign
      </button>
      {open && (
        <Drawer title="Assign case" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="caseId" value={caseId} />
            {officers.length === 0 ? (
              <p className="text-sm text-ink-light">There is no active collection officer at this branch to assign to.</p>
            ) : (
              <div>
                <label className="label">Collection officer</label>
                <select name="employeeId" required className="input" defaultValue={officers[0].id}>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.firstName} {o.lastName ?? ''} ({o.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
            {officers.length > 0 && <Submit idle="Assign" busy="Assigning…" />}
          </form>
        </Drawer>
      )}
    </>
  );
}

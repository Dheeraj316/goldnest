'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  assignTicketAction,
  closeTicketAction,
  reopenTicketAction,
  resolveTicketAction,
  resumeTicketAction,
  startTicketAction,
  waitForCustomerAction,
} from '@/lib/actions/support';
import type { AssignableEmployee, SupportTicket } from '@/lib/types';

type Result = { ok: true; id?: string } | { ok: false; error: string };

function useStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  };
  return { pending, error, run };
}

function Card({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gold-100 bg-white p-5">
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-1 text-sm text-ink-light">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {error}
    </p>
  ) : null;
}

function AssignCard({ t, employees }: { t: SupportTicket; employees: AssignableEmployee[] }) {
  const { pending, error, run } = useStep();
  const [employeeId, setEmployeeId] = useState(t.assignedTo ?? '');
  return (
    <Card title={t.assignedTo ? 'Reassign' : 'Assign'} hint="Whoever it is assigned to is the only one who can work it.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (employeeId) run(() => assignTicketAction(t.id, employeeId));
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex-1">
          <label htmlFor="assignee" className="label">
            Employee
          </label>
          <select id="assignee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input">
            <option value="">— choose —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending || !employeeId} className="btn-primary">
          {pending ? 'Saving…' : t.assignedTo ? 'Reassign' : 'Assign'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function StartCard({ t }: { t: SupportTicket }) {
  const { pending, error, run } = useStep();
  return (
    <Card title="Start work">
      <button onClick={() => run(() => startTicketAction(t.id))} disabled={pending} className="btn-primary">
        {pending ? 'Starting…' : 'Start working on this'}
      </button>
      <ErrorText error={error} />
    </Card>
  );
}

function WaitCard({ t }: { t: SupportTicket }) {
  const { pending, error, run } = useStep();
  const [note, setNote] = useState('');
  return (
    <Card title="Waiting on the customer" hint="Pauses the clock on your side while you wait for a reply.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => waitForCustomerAction(t.id, note), () => setNote(''));
        }}
        className="space-y-3"
      >
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} placeholder="What are you waiting on?" className="input" />
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? 'Saving…' : 'Mark waiting for customer'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function ResumeCard({ t }: { t: SupportTicket }) {
  const { pending, error, run } = useStep();
  return (
    <Card title="Back to work" hint="The customer responded, or the wait is over.">
      <button onClick={() => run(() => resumeTicketAction(t.id))} disabled={pending} className="btn-primary">
        {pending ? 'Resuming…' : 'Resume'}
      </button>
      <ErrorText error={error} />
    </Card>
  );
}

function ResolveCard({ t }: { t: SupportTicket }) {
  const { pending, error, run } = useStep();
  const [note, setNote] = useState('');
  return (
    <Card title="Resolve" hint="What was done, for the record and for the customer.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim().length >= 5) run(() => resolveTicketAction(t.id, note));
        }}
        className="space-y-3"
      >
        <textarea value={note} onChange={(e) => setNote(e.target.value)} required minLength={5} maxLength={2000} rows={3} placeholder="Resolution note" className="input" />
        <button type="submit" disabled={pending || note.trim().length < 5} className="btn-primary">
          {pending ? 'Resolving…' : 'Mark resolved'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function ReopenAndCloseCard({ t }: { t: SupportTicket }) {
  const { pending, error, run } = useStep();
  return (
    <Card title="Resolved" hint="If the customer isn't satisfied, reopen it. Otherwise close it out.">
      <div className="flex gap-2">
        <button onClick={() => run(() => reopenTicketAction(t.id))} disabled={pending} className="btn-secondary">
          Reopen
        </button>
        <button onClick={() => run(() => closeTicketAction(t.id))} disabled={pending} className="btn-primary">
          {pending ? 'Closing…' : 'Close ticket'}
        </button>
      </div>
      <ErrorText error={error} />
    </Card>
  );
}

export function TicketActions({ ticket: t, employees, canManage }: { ticket: SupportTicket; employees: AssignableEmployee[]; canManage: boolean }) {
  if (t.status === 'CLOSED') return <div className="rounded-xl border border-dashed border-gold-200 p-5 text-sm text-ink-light">This ticket is closed.</div>;
  if (!canManage) return <div className="rounded-xl border border-dashed border-gold-200 p-5 text-sm text-ink-light">You do not have access to work on tickets.</div>;

  const cards: ReactNode[] = [];
  if (['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'].includes(t.status)) cards.push(<AssignCard key="assign" t={t} employees={employees} />);
  if (t.status === 'ASSIGNED') cards.push(<StartCard key="start" t={t} />);
  if (t.status === 'IN_PROGRESS') {
    cards.push(<WaitCard key="wait" t={t} />);
    cards.push(<ResolveCard key="resolve" t={t} />);
  }
  if (t.status === 'WAITING_FOR_CUSTOMER') {
    cards.push(<ResumeCard key="resume" t={t} />);
    cards.push(<ResolveCard key="resolve" t={t} />);
  }
  if (t.status === 'RESOLVED') cards.push(<ReopenAndCloseCard key="reopenclose" t={t} />);

  return <div className="space-y-4">{cards}</div>;
}

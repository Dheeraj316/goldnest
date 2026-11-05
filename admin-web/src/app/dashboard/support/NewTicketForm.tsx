'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createTicketByMobileAction } from '@/lib/actions/support';
import { Drawer } from '@/components/Drawer';

const CATEGORIES = ['LOAN', 'PAYMENT', 'KYC', 'COMPLAINT', 'GENERAL'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function NewTicketForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createTicketByMobileAction(mobile, category, description, priority);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setMobile('');
      setDescription('');
      if (res.id) router.push(`/dashboard/support/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> New ticket
      </button>

      {open && (
        <Drawer title="Raise a ticket on a customer's behalf" onClose={() => setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">Customer mobile number</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} required pattern="[6-9]\d{9}" placeholder="9812345678" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">What is this about?</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={5} maxLength={2000} rows={4} className="input" />
            </div>
            <button type="submit" disabled={pending || !mobile.trim() || description.trim().length < 5} className="btn-primary w-full">
              {pending ? 'Raising…' : 'Raise ticket'}
            </button>
            {error && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </form>
        </Drawer>
      )}
    </>
  );
}

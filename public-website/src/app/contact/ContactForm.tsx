'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/config';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch(`${API_URL}/public/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, message, sourcePage: 'contact' }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl2 border border-gold-100 bg-white p-10 text-center shadow-soft">
        <CheckCircle2 className="text-emerald-500" size={36} />
        <p className="font-semibold text-ink">Thanks, {name.split(' ')[0] || 'there'} — we&apos;ve got it.</p>
        <p className="text-sm text-ink-light">A branch team member will reach out shortly. Your enquiry is logged in our system, not just an inbox.</p>
      </div>
    );
  }

  return (
    <form className="space-y-5 rounded-xl2 border border-gold-100 bg-white p-7 shadow-soft" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-light">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-light">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-light">Phone (optional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-light">Message</label>
        <textarea
          required
          minLength={5}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-rose-600">Something went wrong sending that — please try again in a moment.</p>
      )}
      <button type="submit" disabled={status === 'submitting'} className="btn-primary w-full disabled:opacity-60">
        {status === 'submitting' ? 'Sending…' : 'Send enquiry'} <Send size={15} />
      </button>
      <p className="text-xs text-ink-light/70">This reaches our branch team directly — not just an email.</p>
    </form>
  );
}

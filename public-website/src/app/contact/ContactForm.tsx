'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { COMPANY } from '@/lib/config';

// No backend ticketing endpoint exists yet (that's Phase 5 — see
// documentation/roadmap.md), so this deliberately doesn't pretend to submit
// anywhere. It builds a mailto: link from what you type, which opens your own
// mail client — nothing is sent silently or stored by this site.
export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const mailtoHref = `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(
    `Website enquiry from ${name || 'a visitor'}`,
  )}&body=${encodeURIComponent(`${message}\n\n—\n${name}\n${email}`)}`;

  return (
    <form
      className="space-y-5 rounded-xl2 border border-gold-100 bg-white p-7 shadow-soft"
      onSubmit={(e) => {
        e.preventDefault();
        window.location.href = mailtoHref;
      }}
    >
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
        <label className="mb-1.5 block text-sm font-medium text-ink-light">Message</label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
        />
      </div>
      <button type="submit" className="btn-primary w-full">
        Send via email <Send size={15} />
      </button>
      <p className="text-xs text-ink-light/70">This opens your email app addressed to {COMPANY.supportEmail} — we don&apos;t store anything typed here.</p>
    </form>
  );
}

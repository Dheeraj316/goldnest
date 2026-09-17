'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gold-100 px-6 py-5">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-light/60 hover:bg-gold-50 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

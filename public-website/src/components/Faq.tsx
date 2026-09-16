'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FaqItem = { question: string; answer: string };

export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-gold-100 rounded-xl2 border border-gold-100 bg-white shadow-soft">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-ink">{item.question}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-gold-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && <p className="px-6 pb-5 text-sm leading-relaxed text-ink-light">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}

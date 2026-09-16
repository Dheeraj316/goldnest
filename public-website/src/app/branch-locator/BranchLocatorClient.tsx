'use client';

import { useState } from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';
import type { Branch } from '@/lib/content';

export function BranchLocatorClient({ branches }: { branches: Branch[] }) {
  const [selected, setSelected] = useState<Branch>(branches[0]);

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.02}%2C${selected.lat - 0.015}%2C${
    selected.lng + 0.02
  }%2C${selected.lat + 0.015}&layer=mapnik&marker=${selected.lat}%2C${selected.lng}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        {branches.map((branch) => {
          const isActive = branch.code === selected.code;
          return (
            <button
              key={branch.code}
              onClick={() => setSelected(branch)}
              className={`w-full rounded-xl2 border p-5 text-left shadow-soft transition ${
                isActive ? 'border-gold-400 bg-gold-50' : 'border-gold-100 bg-white hover:border-gold-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">{branch.name}</h3>
                <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-300">
                  {branch.code}
                </span>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-light">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gold-500" /> {branch.address}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-light">
                <Phone size={14} className="text-gold-500" /> {branch.phone}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-light">
                <Clock size={14} className="text-gold-500" /> {branch.hours}
              </p>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl2 border border-gold-100 shadow-soft">
        <iframe
          key={selected.code}
          title={`Map showing ${selected.name}`}
          src={mapSrc}
          className="h-[420px] w-full lg:h-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createCollateralAction } from '@/lib/actions/loans';

interface ItemRow {
  itemType: string;
  grossWeight: string;
  stoneWeight: string;
  purityKarat: string;
}

const emptyRow: ItemRow = { itemType: 'NECKLACE', grossWeight: '', stoneWeight: '0', purityKarat: '22' };

export function CollateralForm({ loanId }: { loanId: string }) {
  const [rows, setRows] = useState<ItemRow[]>([{ ...emptyRow }]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const updateRow = (idx: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const submit = () => {
    setError(null);
    const items = rows.map((r) => {
      const gross = Number(r.grossWeight);
      const stone = Number(r.stoneWeight || 0);
      return { itemType: r.itemType, grossWeight: gross, stoneWeight: stone, netWeight: Math.round((gross - stone) * 1000) / 1000, purityKarat: Number(r.purityKarat) };
    });
    if (items.some((i) => !i.itemType || !i.grossWeight || i.grossWeight <= 0)) {
      setError('Every item needs a type and a gross weight greater than zero.');
      return;
    }
    startTransition(async () => {
      const result = await createCollateralAction(loanId, items);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-lg border border-gold-100 p-4">
      <p className="text-sm font-medium text-ink">Record collateral items</p>
      <div className="mt-3 space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 rounded-md bg-cream-100/60 p-2">
            <input
              className="input col-span-3 text-sm"
              placeholder="Item type"
              value={row.itemType}
              onChange={(e) => updateRow(idx, { itemType: e.target.value.toUpperCase() })}
            />
            <input
              className="input col-span-3 text-sm"
              placeholder="Gross wt (g)"
              type="number"
              min="0"
              step="0.001"
              value={row.grossWeight}
              onChange={(e) => updateRow(idx, { grossWeight: e.target.value })}
            />
            <input
              className="input col-span-3 text-sm"
              placeholder="Stone wt (g)"
              type="number"
              min="0"
              step="0.001"
              value={row.stoneWeight}
              onChange={(e) => updateRow(idx, { stoneWeight: e.target.value })}
            />
            <input
              className="input col-span-2 text-sm"
              placeholder="Karat"
              type="number"
              min="1"
              max="24"
              value={row.purityKarat}
              onChange={(e) => updateRow(idx, { purityKarat: e.target.value })}
            />
            <button
              type="button"
              className="col-span-1 flex items-center justify-center text-rose-500 hover:text-rose-700"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
              disabled={rows.length === 1}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary mt-3 text-xs" onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}>
        <Plus size={13} /> Add item
      </button>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      <button type="button" className="btn-primary mt-4 w-full" disabled={pending} onClick={submit}>
        {pending ? 'Saving…' : 'Record collateral'}
      </button>
    </div>
  );
}

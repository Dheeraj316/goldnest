'use client';

import { useMemo, useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { setRolePermissionsAction } from '@/lib/actions/roles';
import type { Permission } from '@/lib/types';

export function PermissionEditor({
  roleId,
  allPermissions,
  initialCodes,
  readOnly,
}: {
  roleId: string;
  allPermissions: Permission[];
  initialCodes: string[];
  readOnly: boolean;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialCodes));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPermissions) {
      const list = map.get(p.resource) || [];
      list.push(p);
      map.set(p.resource, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  function toggle(code: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await setRolePermissionsAction(roleId, Array.from(checked));
      setSaved(true);
    });
  }

  return (
    <div>
      <div className="space-y-5">
        {grouped.map(([resource, perms]) => (
          <div key={resource} className="rounded-xl border border-gold-100 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gold-600">{resource.replace(/_/g, ' ')}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {perms.map((p) => (
                <label key={p.code} className={`flex items-start gap-2.5 text-sm ${readOnly ? '' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={checked.has(p.code)}
                    onChange={() => toggle(p.code)}
                    className="mt-0.5 h-4 w-4 rounded border-navy-900/20 text-gold-500 focus:ring-gold-300"
                  />
                  <span>
                    <span className="font-medium text-ink">{p.action}</span>
                    {p.description && <span className="block text-xs text-ink-light/60">{p.description}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} disabled={isPending} className="btn-primary">
            <Save size={15} /> {isPending ? 'Saving…' : 'Save permissions'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      )}
    </div>
  );
}

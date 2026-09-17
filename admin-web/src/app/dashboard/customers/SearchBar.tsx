'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState, useTransition } from 'react';

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') || '');
  const [, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (value) params.set('q', value);
        else params.delete('q');
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
      }}
      className="relative max-w-sm"
    >
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-light/50" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, mobile or customer code"
        className="input pl-10"
      />
    </form>
  );
}

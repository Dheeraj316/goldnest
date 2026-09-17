import type { Metadata } from 'next';
import Image from 'next/image';
import { ShieldCheck, Vault, ScrollText } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { IMAGES } from '@/lib/images';

export const metadata: Metadata = { title: 'Sign in' };

const POINTS = [
  { icon: ShieldCheck, text: 'Role-based access with branch-level isolation' },
  { icon: Vault, text: 'Every sensitive action requires a second approver' },
  { icon: ScrollText, text: 'Full audit trail on every record you touch' },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith('/') ? params.next : '/dashboard';

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 text-white lg:flex">
        <Image
          src={IMAGES.heroGoldBars}
          alt=""
          fill
          priority
          sizes="50vw"
          className="animate-kenburns object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/60 via-navy-950/85 to-navy-950" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(207,162,58,0.22),transparent_55%)]" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="#CFA23A" />
            <path d="M4 21C4 21 8 25 17 25C26 25 30 21 30 21" stroke="#B8862A" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="font-display text-xl font-semibold">Goldnest Admin</span>
        </div>

        <div className="relative space-y-8">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            The operating console for every branch, every loan, every decision.
          </h1>
          <ul className="space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-sm text-white/70">
                <p.icon size={18} className="mt-0.5 shrink-0 text-gold-300" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">Staff and administrator access only. All access is logged.</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="#CFA23A" />
              <path d="M4 21C4 21 8 25 17 25C26 25 30 21 30 21" stroke="#B8862A" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span className="font-display text-xl font-semibold text-ink">Goldnest Admin</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-light">Use your employee credentials.</p>

          <div className="mt-7">
            <LoginForm next={next} />
          </div>
        </div>
      </div>
    </div>
  );
}

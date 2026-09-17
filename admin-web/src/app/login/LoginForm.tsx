'use client';

import { useActionState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { loginAction, type LoginState } from '@/lib/actions/auth';

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div>
        <label className="label">Mobile or email</label>
        <input name="identifier" type="text" required autoComplete="username" className="input" placeholder="9876543210" />
      </div>

      <div>
        <label className="label">Password</label>
        <input name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>

      <div>
        <label className="label flex items-center gap-1.5">
          <ShieldCheck size={13} /> MFA code (if enabled)
        </label>
        <input name="mfaCode" type="text" inputMode="numeric" maxLength={6} className="input" placeholder="123456" />
      </div>

      {state.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        <Lock size={15} /> {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

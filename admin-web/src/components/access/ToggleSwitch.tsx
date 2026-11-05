'use client';

// An on/off switch that is genuinely a switch to assistive tech (role="switch" + aria-checked), so the
// state is announced and it works from the keyboard. `changed` marks a value that differs from what is
// saved, so an admin can see their pending edits at a glance.
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  changed = false,
  label,
  title,
  size = 'md',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  changed?: boolean;
  label: string;
  title?: string;
  size?: 'sm' | 'md';
}) {
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const travel = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
        track,
        checked ? 'bg-emerald-500' : 'bg-gray-300',
        changed ? 'ring-2 ring-gold-400 ring-offset-1' : '',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
      ].join(' ')}
    >
      <span className={['inline-block rounded-full bg-white shadow transition-transform duration-150', knob, checked ? travel : 'translate-x-0'].join(' ')} />
    </button>
  );
}

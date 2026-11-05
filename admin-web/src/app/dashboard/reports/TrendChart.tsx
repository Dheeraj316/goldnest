import { formatMoney, formatMoneyCompact } from '@/lib/format';
import type { TrendReport } from '@/lib/types';

const W = 900;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 34, left: 64 };

/** Round the axis maximum up to a tidy 1 / 2 / 2.5 / 5 x 10^n so gridlines land on readable amounts. */
function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function TrendChart({ series }: { series: TrendReport['series'] }) {
  const values = series.flatMap((p) => [Number(p.disbursed), Number(p.collected)]);
  const max = niceMax(Math.max(0, ...values));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(series.length, 1);
  const barW = Math.max(2, Math.min(14, slot * 0.36));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.ceil(series.length / 8);
  const empty = values.every((v) => v === 0);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Disbursed and collected amounts per day" className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E9E2CF" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#7A7361">
              {formatMoneyCompact(t).replace('.00', '')}
            </text>
          </g>
        ))}
        {series.map((p, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const d = Number(p.disbursed);
          const c = Number(p.collected);
          return (
            <g key={p.date}>
              <title>{`${dayLabel(p.date)}: disbursed ${formatMoney(p.disbursed)}, collected ${formatMoney(p.collected)}`}</title>
              <rect x={cx - barW - 1} y={y(d)} width={barW} height={Math.max(0, PAD.top + innerH - y(d))} rx={2} fill="#CFA23A" />
              <rect x={cx + 1} y={y(c)} width={barW} height={Math.max(0, PAD.top + innerH - y(c))} rx={2} fill="#1F8A9E" />
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 12} textAnchor="middle" fontSize={11} fill="#7A7361">
                  {dayLabel(p.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {empty && <p className="mt-2 text-center text-xs text-ink-light/60">No money moved in this period.</p>}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-ink-light">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#CFA23A]" /> Disbursed</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#1F8A9E]" /> Collected</span>
      </div>
    </div>
  );
}

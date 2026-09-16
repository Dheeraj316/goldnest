'use client';

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';

// Purely illustrative front-end math — mirrors the shape of the real
// server-side calculator (spec #24) but MUST NOT be trusted for any actual
// loan decision. Every number here is clearly labelled "indicative" and the
// real backend (backend/src/modules/settings) is what drives actual product
// rules once the interest-engine module (Phase 3) ships.
const INDICATIVE_LTV = 0.75;
const INDICATIVE_ANNUAL_RATE = 0.12;
const GOLD_RATE_PER_GRAM_24K = 6200;

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function GoldCalculator() {
  const [weightGrams, setWeightGrams] = useState(20);
  const [purityKarat, setPurityKarat] = useState(22);
  const [tenureMonths, setTenureMonths] = useState(6);

  const result = useMemo(() => {
    const purityFactor = purityKarat / 24;
    const goldValue = weightGrams * GOLD_RATE_PER_GRAM_24K * purityFactor;
    const eligibleLoan = goldValue * INDICATIVE_LTV;
    const interest = eligibleLoan * INDICATIVE_ANNUAL_RATE * (tenureMonths / 12);
    return {
      goldValue,
      eligibleLoan,
      totalRepayment: eligibleLoan + interest,
      interest,
    };
  }, [weightGrams, purityKarat, tenureMonths]);

  return (
    <div className="card overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <div className="space-y-6 p-8 lg:p-10">
          <div>
            <span className="eyebrow">Loan calculator</span>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">Estimate your gold loan</h3>
          </div>

          <Slider
            label="Gold weight"
            value={weightGrams}
            min={5}
            max={200}
            step={1}
            unit="g"
            onChange={setWeightGrams}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-light">Purity</label>
            <div className="flex gap-2">
              {[18, 22, 24].map((karat) => (
                <button
                  key={karat}
                  onClick={() => setPurityKarat(karat)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    purityKarat === karat
                      ? 'border-gold-500 bg-gold-50 text-gold-700'
                      : 'border-navy-900/10 text-ink-light hover:border-gold-300'
                  }`}
                >
                  {karat}K
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Tenure"
            value={tenureMonths}
            min={3}
            max={24}
            step={1}
            unit=" months"
            onChange={setTenureMonths}
          />
        </div>

        <div className="flex flex-col justify-between bg-navy-950 p-8 text-white lg:p-10">
          <div className="space-y-5">
            <Row label="Estimated gold value" value={formatINR(result.goldValue)} />
            <Row label="Eligible loan amount" value={formatINR(result.eligibleLoan)} highlight />
            <Row label={`Estimated interest (${tenureMonths} mo.)`} value={formatINR(result.interest)} />
            <div className="h-px bg-white/10" />
            <Row label="Estimated total repayment" value={formatINR(result.totalRepayment)} />
          </div>

          <div className="mt-8 flex items-start gap-2.5 rounded-xl bg-white/5 p-4 text-xs leading-relaxed text-white/60">
            <Info size={16} className="mt-0.5 shrink-0 text-gold-300" />
            <p>
              This is an <strong className="text-white/80">indicative estimate only</strong>, based on a sample gold rate
              and standard terms. Your actual loan amount, interest rate and LTV are set by branch appraisal and
              admin-configured product rules, and are confirmed only after physical verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-white/60">{label}</span>
      <span className={`font-display text-xl font-semibold ${highlight ? 'text-gold-300' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink-light">{label}</label>
        <span className="font-display text-lg font-semibold text-gold-700">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold-500"
      />
    </div>
  );
}

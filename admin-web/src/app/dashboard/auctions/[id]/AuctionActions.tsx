'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import {
  approveAuctionAction,
  cancelAuctionAction,
  prepareAuctionAction,
  recordAuctionSaleAction,
  scheduleAuctionAction,
  sendAuctionNoticeAction,
  settleAuctionAction,
  writeOffAuctionShortfallAction,
  type AuctionActionResult,
} from '@/lib/actions/auctions';
import { formatDate, formatMoney } from '@/lib/format';
import type { AuctionDetail } from '@/lib/types';

const OPEN = ['CANDIDATE', 'UNDER_REVIEW', 'NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'];
const utcToday = () => new Date().toISOString().slice(0, 10);

/** Runs one workflow step: shows progress and any refusal from the API, and refreshes the page on success. */
function useStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<AuctionActionResult>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  };
  return { pending, error, run };
}

function Card({ title, hint, children, tone = 'default' }: { title: string; hint?: ReactNode; children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <section className={`rounded-xl border p-5 ${tone === 'danger' ? 'border-rose-200 bg-rose-50/40' : 'border-gold-100 bg-white'}`}>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-1 text-sm text-ink-light">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {error}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------------------------------------

function ValuationCard({ a }: { a: AuctionDetail }) {
  const { pending, error, run } = useStep();
  const [rate, setRate] = useState(a.goldRatePerGram ?? '');
  const items = a.collaterals.filter((c) => ['APPRAISED', 'STORED'].includes(c.status)).flatMap((c) => c.items);
  const rateNum = Number(rate);
  // Only a preview: the API does the real (paisa-exact) calculation when it is saved.
  const market = items.reduce((t, i) => t + Number(((Number(i.netWeight) * Number(i.purityKarat)) / 24 * rateNum).toFixed(2)), 0);
  const reserve = (market * a.config.reservePricePercent) / 100;
  const valid = Number.isFinite(rateNum) && rateNum > 0;
  return (
    <Card
      title={a.status === 'CANDIDATE' ? '1. Value the gold and set the reserve price' : 'Value the gold and set the reserve price'}
      hint={`Enter today's market price of 24k gold. The reserve price is ${a.config.reservePricePercent}% of the pledged gold's market value — the lowest the gold may be sold for.`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) run(() => prepareAuctionAction(a.id, rateNum));
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="rate" className="label">
            Gold rate today (₹ per gram, 24k)
          </label>
          <input id="rate" type="number" min="1" step="0.01" required value={rate} onChange={(e) => setRate(e.target.value)} className="input max-w-xs" />
        </div>
        {valid && items.length > 0 && (
          <p className="rounded-lg bg-gold-50/70 px-3.5 py-2.5 text-sm text-ink" data-testid="valuation-preview">
            {items.length} pledged item{items.length === 1 ? '' : 's'} are worth about <strong>{formatMoney(market)}</strong>; the reserve price would be about{' '}
            <strong>{formatMoney(reserve)}</strong>.
          </p>
        )}
        <button type="submit" disabled={pending || !valid} className="btn-primary">
          {pending ? 'Saving…' : a.status === 'CANDIDATE' ? 'Set reserve price' : 'Update reserve price'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

const CHANNELS = [
  ['SMS', 'SMS'],
  ['EMAIL', 'Email'],
  ['POST', 'Registered post'],
  ['PUSH', 'App notification'],
] as const;

function NoticeCard({ a }: { a: AuctionDetail }) {
  const { pending, error, run } = useStep();
  const [picked, setPicked] = useState<string[]>([]);
  const already = new Set(a.notices.map((n) => n.channel));
  const first = a.status === 'UNDER_REVIEW';
  return (
    <Card
      title={first ? '2. Give the borrower notice' : 'Add another notice channel'}
      hint={
        first ? (
          <>
            Sending the first notice starts the <strong>{a.config.noticePeriodDays}-day</strong> notice period. This records that notice was given; delivery through your SMS, email
            and postal providers is not connected yet, so send the notice itself through your usual channel.
          </>
        ) : (
          <>The notice period already runs until {a.noticePeriodEndsAt ? formatDate(a.noticePeriodEndsAt) : '—'}; extra channels do not restart it.</>
        )
      }
    >
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Notice channels</legend>
        {CHANNELS.map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={picked.includes(value)}
              onChange={(e) => setPicked((p) => (e.target.checked ? [...p, value] : p.filter((x) => x !== value)))}
              className="h-4 w-4 rounded border-navy-900/20 text-gold-500"
            />
            {label}
            {already.has(value) && <span className="text-xs text-ink-light/60">(sent)</span>}
          </label>
        ))}
      </fieldset>
      <button disabled={pending || picked.length === 0} onClick={() => run(() => sendAuctionNoticeAction(a.id, picked), () => setPicked([]))} className="btn-primary mt-4">
        {pending ? 'Recording…' : first ? 'Record notice sent' : 'Record additional notice'}
      </button>
      <ErrorText error={error} />
    </Card>
  );
}

function ApproveCard({ a, myEmployeeId }: { a: AuctionDetail; myEmployeeId?: string }) {
  const { pending, error, run } = useStep();
  const [confirming, setConfirming] = useState(false);
  const ends = a.noticePeriodEndsAt ? a.noticePeriodEndsAt.slice(0, 10) : null;
  const waiting = !ends || utcToday() < ends;
  const isMaker = !!myEmployeeId && (myEmployeeId === a.createdBy || myEmployeeId === a.preparedBy);
  return (
    <Card
      title="3. Approve the auction"
      hint="A second person confirms the notice period is over and the loan is still unpaid. The person who prepared the auction cannot approve it."
    >
      {waiting && <p className="mb-3 text-sm text-amber-700">The notice period ends on {ends ? formatDate(ends) : '—'} — approval opens then.</p>}
      {isMaker && <p className="mb-3 text-sm text-amber-700">You prepared this auction, so someone else needs to approve it.</p>}
      {!confirming ? (
        <button onClick={() => setConfirming(true)} disabled={waiting || isMaker} className="btn-primary">
          Approve auction
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink">Approving earmarks the gold for sale — it can then no longer be renewed, topped up or part-released.</span>
          <button onClick={() => run(() => approveAuctionAction(a.id))} disabled={pending} className="btn-primary">
            {pending ? 'Approving…' : 'Confirm approval'}
          </button>
          <button onClick={() => setConfirming(false)} disabled={pending} className="btn-secondary">
            Not yet
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </Card>
  );
}

function ScheduleCard({ a }: { a: AuctionDetail }) {
  const { pending, error, run } = useStep();
  const [date, setDate] = useState(a.scheduledDate ? a.scheduledDate.slice(0, 10) : '');
  const [venue, setVenue] = useState(a.venue ?? '');
  return (
    <Card title={a.status === 'SCHEDULED' ? 'Change the auction date' : '4. Schedule the auction'} hint="Pick the day the gold will be auctioned. It can be moved until the sale has taken place.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (date) run(() => scheduleAuctionAction(a.id, date, venue));
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="auction-date" className="label">
            Auction date
          </label>
          <input id="auction-date" type="date" required min={utcToday()} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="auction-venue" className="label">
            Venue (optional)
          </label>
          <input id="auction-venue" value={venue} maxLength={200} onChange={(e) => setVenue(e.target.value)} className="input" placeholder="e.g. Head Office, MG Road" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending || !date} className="btn-primary">
            {pending ? 'Saving…' : a.status === 'SCHEDULED' ? 'Update date' : 'Schedule auction'}
          </button>
        </div>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function SaleCard({ a }: { a: AuctionDetail }) {
  const { pending, error, run } = useStep();
  const [bids, setBids] = useState([{ bidderName: '', bidAmount: '' }]);
  const notYet = !a.scheduledDate || utcToday() < a.scheduledDate.slice(0, 10);
  const amounts = bids.map((b) => Number(b.bidAmount)).filter((n) => Number.isFinite(n) && n > 0);
  const top = amounts.length ? Math.max(...amounts) : 0;
  const tied = amounts.filter((n) => n === top).length > 1;
  const reserve = Number(a.reservePrice ?? 0);
  const complete = bids.every((b) => b.bidderName.trim().length >= 2 && Number(b.bidAmount) > 0);
  const set = (i: number, patch: Partial<{ bidderName: string; bidAmount: string }>) => setBids((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <Card
      title="5. Record the sale"
      hint={`Enter every bid received. The highest wins and must be at least the reserve price of ${a.reservePrice ? formatMoney(a.reservePrice) : '—'}. The sale money is applied to interest, then charges, then principal; anything left over belongs to the borrower.`}
    >
      {notYet && <p className="mb-3 text-sm text-amber-700">The sale can be recorded from the auction date ({a.scheduledDate ? formatDate(a.scheduledDate) : '—'}).</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (complete && !tied && top >= reserve) run(() => recordAuctionSaleAction(a.id, bids.map((b) => ({ bidderName: b.bidderName.trim(), bidAmount: Number(b.bidAmount) }))));
        }}
        className="space-y-3"
      >
        {bids.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_9rem_auto] items-end gap-2">
            <div>
              <label htmlFor={`bidder-${i}`} className="label">
                Bidder {i + 1}
              </label>
              <input id={`bidder-${i}`} value={b.bidderName} maxLength={120} onChange={(e) => set(i, { bidderName: e.target.value })} className="input" placeholder="Name of bidder" />
            </div>
            <div>
              <label htmlFor={`bid-${i}`} className="label">
                Bid (₹)
              </label>
              <input id={`bid-${i}`} type="number" min="1" step="0.01" value={b.bidAmount} onChange={(e) => set(i, { bidAmount: e.target.value })} className="input" />
            </div>
            <button
              type="button"
              onClick={() => setBids((prev) => prev.filter((_, j) => j !== i))}
              disabled={bids.length === 1}
              aria-label={`Remove bidder ${i + 1}`}
              className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-light hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <div>
          <button type="button" onClick={() => setBids((p) => [...p, { bidderName: '', bidAmount: '' }])} className="inline-flex items-center gap-1 text-sm font-medium text-gold-600 hover:text-gold-700">
            <Plus size={14} /> Add another bid
          </button>
        </div>
        {top > 0 && (
          <p className={`rounded-lg px-3.5 py-2.5 text-sm ${tied || top < reserve ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`} role="status">
            {tied
              ? 'Two bids are tied for highest — the tie has to be resolved before the sale can be recorded.'
              : top < reserve
                ? `The highest bid (${formatMoney(top)}) is below the reserve price, so the gold cannot be sold at this auction.`
                : `Highest bid ${formatMoney(top)} — meets the reserve price.`}
          </p>
        )}
        <button type="submit" disabled={pending || notYet || !complete || tied || top < reserve} className="btn-primary">
          {pending ? 'Recording…' : 'Record sale'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function SettleCard({ a, myEmployeeId }: { a: AuctionDetail; myEmployeeId?: string }) {
  const { pending, error, run } = useStep();
  const [mode, setMode] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const recordedByMe = !!myEmployeeId && myEmployeeId === a.saleRecordedBy;
  return (
    <Card title="6. Pay the surplus back to the borrower" hint={`The gold sold for more than was owed. ${a.surplusAmount ? formatMoney(a.surplusAmount) : ''} belongs to the borrower. The person who recorded the sale cannot also pay it out.`}>
      {recordedByMe && <p className="mb-3 text-sm text-amber-700">You recorded this sale, so someone else needs to pay out the surplus.</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => settleAuctionAction(a.id, mode, reference));
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="payout-mode" className="label">
            How it was paid
          </label>
          <select id="payout-mode" value={mode} onChange={(e) => setMode(e.target.value)} className="input">
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
          </select>
        </div>
        <div>
          <label htmlFor="payout-ref" className="label">
            Reference (optional)
          </label>
          <input id="payout-ref" value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} className="input" placeholder="UTR / cheque number" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending || recordedByMe} className="btn-primary">
            {pending ? 'Recording…' : 'Record surplus payout'}
          </button>
        </div>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function WriteOffCard({ a, myEmployeeId }: { a: AuctionDetail; myEmployeeId?: string }) {
  const { pending, error, run } = useStep();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const recordedByMe = !!myEmployeeId && myEmployeeId === a.saleRecordedBy;
  return (
    <Card
      tone="danger"
      title="Write off what is still owed"
      hint={`The sale did not cover the whole debt and ${a.shortfall ? formatMoney(a.shortfall.remaining) : 'an amount'} is still owed. If it is not expected to be recovered, it can be written off: the principal goes to loss and the unpaid interest and charges are waived. This cannot be undone, and the person who recorded the sale cannot do it.`}
    >
      {recordedByMe && <p className="mb-3 text-sm text-amber-700">You recorded this sale, so someone else needs to write off the remainder.</p>}
      {!open ? (
        <button onClick={() => setOpen(true)} disabled={recordedByMe} className="btn-danger">
          Write off the remainder…
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="writeoff-reason" className="label">
              Reason (kept on the record)
            </label>
            <textarea id="writeoff-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => run(() => writeOffAuctionShortfallAction(a.id, reason))} disabled={pending || reason.trim().length < 5} className="btn-danger">
              {pending ? 'Writing off…' : 'Confirm write-off'}
            </button>
            <button onClick={() => setOpen(false)} disabled={pending} className="btn-secondary">
              Not now
            </button>
          </div>
        </div>
      )}
      <ErrorText error={error} />
    </Card>
  );
}

function CancelCard({ a }: { a: AuctionDetail }) {
  const { pending, error, run } = useStep();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <Card tone="danger" title="Call off this auction" hint="Use this if the borrower has arranged payment, or something was found to be wrong. The loan stays as it was, and the gold goes back to being ordinary pledged security.">
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-danger">
          Cancel auction…
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="cancel-reason" className="label">
              Reason (kept on the record)
            </label>
            <textarea id="cancel-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => run(() => cancelAuctionAction(a.id, reason))} disabled={pending || reason.trim().length < 5} className="btn-danger">
              {pending ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
            <button onClick={() => setOpen(false)} disabled={pending} className="btn-secondary">
              Keep auction
            </button>
          </div>
        </div>
      )}
      <ErrorText error={error} />
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------

export function AuctionActions({ auction: a, can, myEmployeeId }: { auction: AuctionDetail; can: { manage: boolean; approve: boolean; settle: boolean; writeoff: boolean }; myEmployeeId?: string }) {
  const isOpen = OPEN.includes(a.status);
  const cards: ReactNode[] = [];

  if (can.manage && ['CANDIDATE', 'UNDER_REVIEW'].includes(a.status)) cards.push(<ValuationCard key="valuation" a={a} />);
  if (can.manage && ['UNDER_REVIEW', 'NOTICE_SENT'].includes(a.status)) cards.push(<NoticeCard key="notice" a={a} />);
  if (can.approve && a.status === 'NOTICE_SENT') cards.push(<ApproveCard key="approve" a={a} myEmployeeId={myEmployeeId} />);
  if (can.manage && ['APPROVED', 'SCHEDULED'].includes(a.status)) cards.push(<ScheduleCard key="schedule" a={a} />);
  if (can.settle && a.status === 'SCHEDULED') cards.push(<SaleCard key="sale" a={a} />);
  if (can.settle && a.status === 'COMPLETED') cards.push(<SettleCard key="settle" a={a} myEmployeeId={myEmployeeId} />);
  if (can.writeoff && ['COMPLETED', 'SETTLED'].includes(a.status) && a.shortfall && Number(a.shortfall.remaining) > 0.01) cards.push(<WriteOffCard key="writeoff" a={a} myEmployeeId={myEmployeeId} />);
  if (can.manage && isOpen) cards.push(<CancelCard key="cancel" a={a} />);

  if (cards.length === 0) {
    const waiting: Record<string, string> = {
      CANDIDATE: 'Waiting for someone with auction management access to value the gold and set the reserve price.',
      UNDER_REVIEW: 'Waiting for the notice to be sent.',
      NOTICE_SENT: 'Waiting for the notice period to end and a second person to approve.',
      APPROVED: 'Waiting for the auction to be scheduled.',
      SCHEDULED: 'Waiting for the auction to take place and the sale to be recorded.',
      COMPLETED: 'Waiting for the surplus to be paid back to the borrower.',
    };
    return (
      <div className="rounded-xl border border-dashed border-gold-200 p-5 text-sm text-ink-light">
        {isOpen || a.status === 'COMPLETED' ? (
          <span className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold-600" />
            <span>
              {waiting[a.status] ?? 'Nothing to do here.'} You do not have access to take the next step.
            </span>
          </span>
        ) : (
          'This auction is finished — there is nothing more to do.'
        )}
      </div>
    );
  }
  return <div className="space-y-4">{cards}</div>;
}

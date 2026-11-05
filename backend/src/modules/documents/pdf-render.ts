import PDFDocument = require('pdfkit');
import { formatInr, rupeesInWords } from '../../common/utils/money-words';
import { maskIdentifier } from '../../common/utils/mask';

// ---- palette (matches the apps) --------------------------------------------------------------------
const NAVY = '#0F172A';
const GOLD = '#B8862A';
const GOLD_LIGHT = '#F6EFDD';
const INK = '#1F1B14';
const MUTED = '#6B6455';
const LINE = '#E4DFD3';
const ROSE = '#B3261E';

const PAGE = { w: 595.28, h: 841.89, margin: 48 };
const CONTENT_W = PAGE.w - PAGE.margin * 2;

/** Renders a PDF with `draw` and resolves the finished bytes. */
function render(title: string, draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // bufferPages lets the footer say "Page n of N"; the small bottom margin keeps the footer inside the page (all body layout is manual).
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: PAGE.margin, left: PAGE.margin, right: PAGE.margin, bottom: 24 }, info: { Title: title, Author: 'Goldnest', Producer: 'Goldnest' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      draw(doc);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/** "21 Sep 2026, 7:52 am IST" — always Indian time, whatever the server's own clock says. */
export function formatIst(value: Date): string {
  const s = value.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  return `${s.replace(/\bam\b/i, 'am').replace(/\bpm\b/i, 'pm')} IST`;
}
export function formatDay(value: Date | null | undefined): string {
  return value ? value.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function masthead(doc: PDFKit.PDFDocument, heading: string, sub?: string) {
  doc.rect(0, 0, PAGE.w, 84).fill(NAVY);
  doc.rect(0, 84, PAGE.w, 3).fill(GOLD);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('GOLDNEST', PAGE.margin, 28, { characterSpacing: 2 });
  doc.fillColor('#DFB95C').font('Helvetica').fontSize(9).text('Secured gold loans', PAGE.margin, 54);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13).text(heading, PAGE.margin, 30, { width: CONTENT_W, align: 'right' });
  if (sub) doc.fillColor('#C7CDDB').font('Helvetica').fontSize(9).text(sub, PAGE.margin, 50, { width: CONTENT_W, align: 'right' });
  doc.fillColor(INK);
  doc.y = 110;
}

function label(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text(text.toUpperCase(), x, y, { characterSpacing: 0.8 });
}
function value(doc: PDFKit.PDFDocument, text: string, x: number, y: number, opts: PDFKit.Mixins.TextOptions = {}) {
  doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(text, x, y, opts);
}
/** A label above a value, in a column of the given width. Returns the bottom y. */
function field(doc: PDFKit.PDFDocument, x: number, y: number, w: number, lab: string, val: string) {
  label(doc, lab, x, y);
  value(doc, val, x, y + 11, { width: w });
  return doc.y;
}

function footer(doc: PDFKit.PDFDocument, lines: string[]) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = PAGE.h - 58;
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5);
    lines.forEach((l, n) => doc.text(l, PAGE.margin, y + 8 + n * 10, { width: CONTENT_W - 60, lineBreak: false }));
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, PAGE.w - PAGE.margin - 60, y + 8, { width: 60, align: 'right', lineBreak: false });
  }
}

// =====================================================================================================
// RECEIPT
// =====================================================================================================

export interface ReceiptPdfData {
  receiptNumber: string;
  issuedAt: Date;
  paymentNumber: string;
  paymentMode: string;
  loanNumber: string;
  productName: string;
  customerName: string;
  customerCode: string;
  customerMobile: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string | null;
  principal: string;
  interest: string;
  charges: string;
  total: string;
}

export function renderReceiptPdf(d: ReceiptPdfData): Promise<Buffer> {
  return render(`Receipt ${d.receiptNumber}`, (doc) => {
    masthead(doc, 'PAYMENT RECEIPT', d.receiptNumber);

    // reference strip
    let y = 112;
    const col = CONTENT_W / 3;
    field(doc, PAGE.margin, y, col - 8, 'Receipt number', d.receiptNumber);
    field(doc, PAGE.margin + col, y, col - 8, 'Date and time', formatIst(d.issuedAt));
    field(doc, PAGE.margin + col * 2, y, col - 8, 'Payment reference', `${d.paymentNumber} · ${d.paymentMode}`);

    // two info panels
    y += 46;
    doc.roundedRect(PAGE.margin, y, CONTENT_W, 92, 6).fill(GOLD_LIGHT);
    const half = CONTENT_W / 2;
    label(doc, 'Received from', PAGE.margin + 14, y + 12);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(d.customerName, PAGE.margin + 14, y + 24, { width: half - 28 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(`Customer ${d.customerCode}`, PAGE.margin + 14, y + 42, { width: half - 28 });
    doc.text(`Mobile ${maskIdentifier(d.customerMobile, 4)}`, PAGE.margin + 14, y + 55, { width: half - 28 });
    label(doc, 'Towards loan', PAGE.margin + half + 6, y + 12);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(d.loanNumber, PAGE.margin + half + 6, y + 24, { width: half - 20 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(d.productName, PAGE.margin + half + 6, y + 42, { width: half - 20 });
    doc.text(d.branchName, PAGE.margin + half + 6, y + 55, { width: half - 20 });

    // breakdown table
    y += 116;
    doc.rect(PAGE.margin, y, CONTENT_W, 24).fill(NAVY);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text('APPLIED TO', PAGE.margin + 14, y + 8, { characterSpacing: 0.8 });
    doc.text('AMOUNT', PAGE.margin, y + 8, { width: CONTENT_W - 14, align: 'right', characterSpacing: 0.8 });
    y += 24;
    const rows: Array<[string, string]> = [
      ['Interest', d.interest],
      ['Charges and fees', d.charges],
      ['Principal', d.principal],
    ];
    rows.forEach(([name, amt], i) => {
      if (i % 2 === 1) doc.rect(PAGE.margin, y, CONTENT_W, 26).fill('#FBF8F1');
      doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(name, PAGE.margin + 14, y + 8);
      doc.text(formatInr(amt), PAGE.margin, y + 8, { width: CONTENT_W - 14, align: 'right' });
      y += 26;
    });
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).lineWidth(1).strokeColor(GOLD).stroke();
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text('Total received', PAGE.margin + 14, y + 12);
    doc.text(formatInr(d.total), PAGE.margin, y + 12, { width: CONTENT_W - 14, align: 'right' });
    y += 44;

    label(doc, 'Amount in words', PAGE.margin, y);
    doc.fillColor(INK).font('Helvetica-Oblique').fontSize(10.5).text(rupeesInWords(d.total), PAGE.margin, y + 12, { width: CONTENT_W });

    y = doc.y + 26;
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(
      'Payments are applied to interest first, then charges, then principal. This receipt confirms the amount received on the date shown; it is not a statement of the balance outstanding — see the loan statement for that.',
      PAGE.margin, y, { width: CONTENT_W, lineGap: 2 },
    );
    footer(doc, [
      `Issued by Goldnest, ${d.branchName}${d.branchAddress ? `, ${d.branchAddress}` : ''}${d.branchPhone ? ` · ${d.branchPhone}` : ''}`,
      'This is a computer-generated receipt and does not require a signature.',
    ]);
  });
}

// =====================================================================================================
// LOAN STATEMENT
// =====================================================================================================

export interface StatementLine {
  date: Date;
  description: string;
  reference: string | null;
  debit: string | null; // added to what the customer owes (a disbursement)
  credit: string | null; // paid in
  principalBalance: string; // principal outstanding after this line
}

export interface StatementPdfData {
  generatedAt: Date;
  loanNumber: string;
  status: string;
  productName: string;
  customerName: string;
  customerCode: string;
  branchName: string;
  principalAmount: string;
  interestRate: string;
  ltvPercent: string;
  tenureDays: number;
  startDate: Date | null;
  maturityDate: Date | null;
  closedAt: Date | null;
  totals: { disbursed: string; principalPaid: string; interestPaid: string; chargesPaid: string };
  outstanding: { principal: string; interest: string; charges: string; total: string };
  lines: StatementLine[];
}

export function renderStatementPdf(d: StatementPdfData): Promise<Buffer> {
  return render(`Loan statement ${d.loanNumber}`, (doc) => {
    masthead(doc, 'LOAN STATEMENT', d.loanNumber);

    let y = 110;
    const col = CONTENT_W / 4;
    const colW = col - 10;
    field(doc, PAGE.margin, y, colW, 'Customer', `${d.customerName}`);
    field(doc, PAGE.margin + col, y, colW, 'Customer code', d.customerCode);
    field(doc, PAGE.margin + col * 2, y, colW, 'Product', d.productName);
    field(doc, PAGE.margin + col * 3, y, colW, 'Branch', d.branchName);
    y += 46;
    field(doc, PAGE.margin, y, colW, 'Status', d.status.replace(/_/g, ' '));
    field(doc, PAGE.margin + col, y, colW, 'Interest rate', `${d.interestRate}% p.a.`);
    field(doc, PAGE.margin + col * 2, y, colW, 'Started', formatDay(d.startDate));
    field(doc, PAGE.margin + col * 3, y, colW, d.closedAt ? 'Closed' : 'Matures', formatDay(d.closedAt ?? d.maturityDate));
    y += 44;

    // outstanding panel
    const boxH = 66;
    doc.roundedRect(PAGE.margin, y, CONTENT_W, boxH, 6).fill(NAVY);
    doc.fillColor('#DFB95C').font('Helvetica-Bold').fontSize(8).text(`OUTSTANDING AS OF ${formatIst(d.generatedAt).toUpperCase()}`, PAGE.margin + 16, y + 12, { characterSpacing: 0.6 });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(formatInr(d.outstanding.total), PAGE.margin + 16, y + 28);
    const parts: Array<[string, string]> = [['Principal', d.outstanding.principal], ['Interest', d.outstanding.interest], ['Charges', d.outstanding.charges]];
    parts.forEach(([n, v], i) => {
      const x = PAGE.margin + 250 + i * 88;
      doc.fillColor('#C7CDDB').font('Helvetica').fontSize(8).text(n.toUpperCase(), x, y + 16, { width: 84 });
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text(formatInr(v), x, y + 30, { width: 84 });
    });
    y += boxH + 14;

    // paid-to-date summary
    const sums: Array<[string, string]> = [
      ['Disbursed to date', d.totals.disbursed],
      ['Principal repaid', d.totals.principalPaid],
      ['Interest paid', d.totals.interestPaid],
      ['Charges paid', d.totals.chargesPaid],
    ];
    sums.forEach(([n, v], i) => field(doc, PAGE.margin + col * i, y, colW, n, formatInr(v)));
    y += 44;

    // transaction table — every column sits inside the 48pt margins (right edge = 547pt)
    const C = {
      date: { x: 56, w: 58 },
      desc: { x: 118, w: 170 },
      debit: { x: 290, w: 72 },
      credit: { x: 366, w: 72 },
      bal: { x: 442, w: 97 },
    };
    const tableHead = () => {
      doc.rect(PAGE.margin, y, CONTENT_W, 22).fill(NAVY);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      doc.text('DATE', C.date.x, y + 7, { width: C.date.w });
      doc.text('DESCRIPTION', C.desc.x, y + 7, { width: C.desc.w });
      doc.text('DISBURSED', C.debit.x, y + 7, { width: C.debit.w, align: 'right' });
      doc.text('PAID', C.credit.x, y + 7, { width: C.credit.w, align: 'right' });
      doc.text('PRINCIPAL BAL.', C.bal.x, y + 7, { width: C.bal.w, align: 'right' });
      y += 22;
    };
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Transactions', PAGE.margin, y - 2);
    y += 18;
    tableHead();
    if (d.lines.length === 0) {
      doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(10).text('No transactions have been recorded on this loan yet.', PAGE.margin + 8, y + 10);
      y += 34;
    }
    d.lines.forEach((l, i) => {
      const desc = l.reference ? `${l.description} (${l.reference})` : l.description;
      const h = Math.max(22, doc.font('Helvetica').fontSize(9).heightOfString(desc, { width: C.desc.w }) + 12);
      if (y + h > PAGE.h - 80) {
        doc.addPage();
        y = PAGE.margin;
        tableHead();
      }
      if (i % 2 === 1) doc.rect(PAGE.margin, y, CONTENT_W, h).fill('#FBF8F1');
      doc.fillColor(INK).font('Helvetica').fontSize(9);
      doc.text(formatDay(l.date), C.date.x, y + 7, { width: C.date.w });
      doc.text(desc, C.desc.x, y + 7, { width: C.desc.w });
      doc.text(l.debit ? formatInr(l.debit) : '', C.debit.x, y + 7, { width: C.debit.w, align: 'right' });
      doc.fillColor('#1B6B46').text(l.credit ? formatInr(l.credit) : '', C.credit.x, y + 7, { width: C.credit.w, align: 'right' });
      doc.fillColor(INK).font('Helvetica-Bold').text(formatInr(l.principalBalance), C.bal.x, y + 7, { width: C.bal.w, align: 'right' });
      y += h;
    });
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).lineWidth(0.5).strokeColor(LINE).stroke();

    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(
      'Interest accrues daily on the principal outstanding and is shown as part of the outstanding amount above; it appears in the table only when paid. Amounts are in Indian rupees. Times and dates follow Indian Standard Time.',
      PAGE.margin, y + 14, { width: CONTENT_W, lineGap: 2 },
    );
    if (d.status === 'OVERDUE') {
      doc.fillColor(ROSE).font('Helvetica-Bold').fontSize(9).text('This loan is past its due date. Please contact your branch to settle the amount outstanding.', PAGE.margin, doc.y + 10, { width: CONTENT_W });
    }
    footer(doc, [`Generated ${formatIst(d.generatedAt)} for ${d.customerName} · ${d.branchName}`, 'This is a computer-generated statement and does not require a signature.']);
  });
}

// =====================================================================================================
// AUCTION NOTICE
// =====================================================================================================

export interface AuctionNoticePdfData {
  auctionNumber: string;
  noticeSentAt: Date;
  noticePeriodEndsAt: Date;
  scheduledDate: Date | null;
  venue: string | null;
  generatedAt: Date;
  loanNumber: string;
  productName: string;
  customerName: string;
  customerCode: string;
  customerMobile: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string | null;
  /** What is owed as of `generatedAt` — it grows daily as interest accrues. */
  principal: string;
  interest: string;
  charges: string;
  total: string;
  items: { itemType: string; netWeight: string; purityKarat: string }[];
  /** The wording that carries legal weight. Comes from Configuration so the lender's legal team owns it, not the code. */
  legalText: string;
}

/**
 * The notice a borrower receives before their pledged gold can be put up for auction: what is owed, until when
 * they can pay it and get their gold back, and where. It deliberately leaves out the reserve price and anything
 * else internal to the lender's process.
 */
export function renderAuctionNoticePdf(d: AuctionNoticePdfData): Promise<Buffer> {
  return render(`Notice of intended auction ${d.auctionNumber}`, (doc) => {
    masthead(doc, 'NOTICE OF INTENDED AUCTION', d.auctionNumber);

    // Starts a new page if what comes next would not fit above the footer.
    const room = (y: number, needed: number) => {
      if (y + needed <= PAGE.h - 84) return y;
      doc.addPage();
      return PAGE.margin;
    };

    let y = 112;
    const col = CONTENT_W / 3;
    field(doc, PAGE.margin, y, col - 8, 'Notice issued', formatDay(d.noticeSentAt));
    field(doc, PAGE.margin + col, y, col - 8, 'Loan number', d.loanNumber);
    field(doc, PAGE.margin + col * 2, y, col - 8, 'Redeem your gold by', formatDay(d.noticePeriodEndsAt));

    y += 46;
    doc.roundedRect(PAGE.margin, y, CONTENT_W, 78, 6).fill(GOLD_LIGHT);
    const half = CONTENT_W / 2;
    label(doc, 'To (borrower)', PAGE.margin + 14, y + 12);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(d.customerName, PAGE.margin + 14, y + 24, { width: half - 28 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(`Customer ${d.customerCode}`, PAGE.margin + 14, y + 42, { width: half - 28 });
    doc.text(`Mobile ${maskIdentifier(d.customerMobile, 4)}`, PAGE.margin + 14, y + 55, { width: half - 28 });
    label(doc, 'Your loan', PAGE.margin + half + 6, y + 12);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(d.loanNumber, PAGE.margin + half + 6, y + 24, { width: half - 20 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(d.productName, PAGE.margin + half + 6, y + 42, { width: half - 20 });
    doc.text(d.branchName, PAGE.margin + half + 6, y + 55, { width: half - 20 });

    // what is owed
    y += 100;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Amount you need to pay to keep your gold', PAGE.margin, y);
    y += 22;
    doc.rect(PAGE.margin, y, CONTENT_W, 22).fill(NAVY);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('DUE', PAGE.margin + 14, y + 7, { characterSpacing: 0.8 });
    doc.text('AMOUNT', PAGE.margin, y + 7, { width: CONTENT_W - 14, align: 'right', characterSpacing: 0.8 });
    y += 22;
    const rows: Array<[string, string]> = [
      ['Principal (the amount you borrowed and have not repaid)', d.principal],
      ['Interest', d.interest],
      ['Charges and fees', d.charges],
    ];
    rows.forEach(([name, amt], i) => {
      if (i % 2 === 1) doc.rect(PAGE.margin, y, CONTENT_W, 24).fill('#FBF8F1');
      doc.fillColor(INK).font('Helvetica').fontSize(10).text(name, PAGE.margin + 14, y + 7);
      doc.text(formatInr(amt), PAGE.margin, y + 7, { width: CONTENT_W - 14, align: 'right' });
      y += 24;
    });
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).lineWidth(1).strokeColor(GOLD).stroke();
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12.5).text(`Total due on ${formatDay(d.generatedAt)}`, PAGE.margin + 14, y + 11);
    doc.text(formatInr(d.total), PAGE.margin, y + 11, { width: CONTENT_W - 14, align: 'right' });
    y += 40;
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(
      'Interest is added every day until the loan is repaid, so the amount due grows. Your branch will confirm the exact amount payable on the day you pay.',
      PAGE.margin, y, { width: CONTENT_W, lineGap: 2 },
    );

    // how to get the gold back
    y = room(doc.y + 20, 90);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('How to get your gold back', PAGE.margin, y);
    doc.fillColor(INK).font('Helvetica').fontSize(10).text(
      `Pay the total due at ${d.branchName}${d.branchAddress ? `, ${d.branchAddress}` : ''}${d.branchPhone ? ` (phone ${d.branchPhone})` : ''} on or before ${formatDay(d.noticePeriodEndsAt)}. Once the loan is paid in full, your gold is returned to you. You may also pay at any time before the auction takes place.`,
      PAGE.margin, y + 18, { width: CONTENT_W, lineGap: 2 },
    );

    // the gold covered
    y = room(doc.y + 20, 40 + d.items.length * 20);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Gold pledged for this loan', PAGE.margin, y);
    y += 20;
    d.items.forEach((it, i) => {
      if (i % 2 === 0) doc.rect(PAGE.margin, y, CONTENT_W, 20).fill('#FBF8F1');
      doc.fillColor(INK).font('Helvetica').fontSize(10).text(it.itemType.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), PAGE.margin + 14, y + 5);
      doc.text(`${Number(it.netWeight)} g net · ${Number(it.purityKarat)} karat`, PAGE.margin, y + 5, { width: CONTENT_W - 14, align: 'right' });
      y += 20;
    });

    if (d.scheduledDate) {
      y = room(y + 16, 40);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Auction', PAGE.margin, y);
      doc.fillColor(INK).font('Helvetica').fontSize(10).text(
        `If the loan is not repaid, the gold is scheduled to be auctioned on ${formatDay(d.scheduledDate)}${d.venue ? ` at ${d.venue}` : ''}.`,
        PAGE.margin, y + 18, { width: CONTENT_W, lineGap: 2 },
      );
      y = doc.y;
    }

    // the wording that carries legal weight — owned by the lender's legal team through Configuration
    y = room(y + 18, 70);
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(d.legalText, PAGE.margin, y + 10, { width: CONTENT_W, lineGap: 2 });

    footer(doc, [
      `Issued by Goldnest, ${d.branchName}${d.branchAddress ? `, ${d.branchAddress}` : ''}${d.branchPhone ? ` · ${d.branchPhone}` : ''}`,
      `Generated ${formatIst(d.generatedAt)}. This is a computer-generated notice and does not require a signature.`,
    ]);
  });
}

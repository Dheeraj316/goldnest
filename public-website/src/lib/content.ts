import type { FaqItem } from '@/components/Faq';

export const homeFaqs: FaqItem[] = [
  {
    question: 'How much can I borrow against my gold?',
    answer:
      'It depends on the weight and purity of your gold and the loan-to-value (LTV) ratio in effect at the time — currently configured up to a regulatory-compliant maximum. Your branch appraiser gives you an exact, itemised figure before you commit to anything.',
  },
  {
    question: 'Is my gold safe?',
    answer:
      'Yes. Every item is photographed, weighed and sealed into a tamper-evident packet with a unique ID at intake, then stored in a tracked vault. Every movement in or out of the vault is logged against an authorised employee.',
  },
  {
    question: 'What happens if I can’t repay on time?',
    answer:
      'We’ll notify you well before your due date and offer configured grace periods and renewal options. Auction is a last resort, only after required notice periods and customer communication — never a surprise.',
  },
];

export const fullFaqs: FaqItem[] = [
  ...homeFaqs,
  {
    question: 'What documents do I need to apply?',
    answer:
      'A government-issued photo ID (like PAN or another accepted identity document) and an address proof. See the Documents Required page for the current list — requirements are configurable and may vary by loan amount.',
  },
  {
    question: 'How is the interest calculated?',
    answer:
      'Interest is calculated by our interest engine using the rate, methodology (flat or reducing balance) and accrual frequency configured for your product at disbursement — the exact figures are shown in your loan agreement before you sign.',
  },
  {
    question: 'Can I make part-payments?',
    answer:
      'Where your product terms allow it, yes — you can pay down interest, make a partial principal payment, or close the loan early. Available options are shown in the app for your specific loan.',
  },
  {
    question: 'What types of gold jewellery are accepted?',
    answer:
      'Gold jewellery within our accepted purity range. Items with excessive stone weight, or that fall outside policy, may be valued differently or declined at appraisal — your appraiser will explain any adjustment on the spot.',
  },
  {
    question: 'How do I get my gold back?',
    answer:
      'Once your loan is fully repaid (principal, interest and any applicable charges), your collateral is released — tracked through the same vault system it was checked into, and handed back only to you or your authorised representative.',
  },
];

export type Branch = {
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  hours: string;
  lat: number;
  lng: number;
};

// Fallback branch network, used only if the backend at NEXT_PUBLIC_API_URL is
// unreachable — see lib/api.ts#getPublicBranches, which is what the locator
// page actually renders (real branches from the shared database).
export const branches: Branch[] = [
  {
    code: 'HO01',
    name: 'Goldnest Head Office Branch',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'MG Road, Bengaluru, Karnataka 560001',
    phone: '080-0000-0000',
    hours: 'Mon–Sat, 9:30 AM – 6:30 PM',
    lat: 12.9757,
    lng: 77.6079,
  },
  {
    code: 'BLR02',
    name: 'Goldnest Jayanagar Branch',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '4th Block, Jayanagar, Bengaluru, Karnataka 560011',
    phone: '080-0000-0001',
    hours: 'Mon–Sat, 9:30 AM – 6:30 PM',
    lat: 12.9308,
    lng: 77.5838,
  },
  {
    code: 'MYS01',
    name: 'Goldnest Mysuru Branch',
    city: 'Mysuru',
    state: 'Karnataka',
    address: 'Devaraja Mohalla, Mysuru, Karnataka 570001',
    phone: '0821-000-0000',
    hours: 'Mon–Sat, 9:30 AM – 6:30 PM',
    lat: 12.3052,
    lng: 76.6552,
  },
];

export const documentsRequired = {
  identity: [
    'PAN card, or',
    'Aadhaar (or another legally accepted government photo ID)',
  ],
  address: ['Utility bill, bank statement, or other accepted address proof not older than 3 months'],
  photo: ['One recent passport-size photograph, or a live photo captured in the app'],
  notes:
    'Exact document requirements are admin-configurable per product and loan amount, and may be updated to meet KYC/AML requirements — the app always shows the current, authoritative list at the time you apply.',
};

export const eligibility = [
  { label: 'Age', value: '18 years or older' },
  { label: 'Ownership', value: 'You must be the owner of the gold jewellery pledged' },
  { label: 'Identity & address proof', value: 'Valid, current KYC documents as configured for your loan amount' },
  { label: 'Gold purity', value: 'Within the accepted purity range — confirmed at branch appraisal' },
];

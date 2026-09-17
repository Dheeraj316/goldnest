import type { Metadata } from 'next';
import Image from 'next/image';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';
import { ShieldCheck, ScrollText, Users, Scale } from 'lucide-react';
import { IMAGES } from '@/lib/images';

export const metadata: Metadata = { title: 'About Us' };

const VALUES = [
  { icon: ShieldCheck, title: 'Security first', description: 'Every rupee lent and every gram of gold held is tracked through an auditable, tamper-evident system.' },
  { icon: Scale, title: 'Fair by design', description: 'Interest, fees and LTV are policy-driven and disclosed upfront — not negotiated on the spot.' },
  { icon: Users, title: 'People, not just accounts', description: 'Our branch staff walk you through every number before you sign anything.' },
  { icon: ScrollText, title: 'Compliance-minded', description: 'Built around KYC/AML, maker-checker approvals and full audit trails from the ground up.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="A gold loan business built on traceability"
        description="Goldnest is a new secured-lending business focused on one thing: making gold loans transparent, fairly priced, and fully accountable — from the moment your gold arrives to the moment it's returned."
      />

      <section className="py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-start">
          <SectionHeading
            eyebrow="Our approach"
            title="Why we built Goldnest this way"
            description="Gold loans are simple in concept but easy to get wrong in practice — unclear pricing, informal record-keeping, and opaque auction processes are common industry pain points. We set out to build the opposite: every valuation itemised, every rate configured and disclosed, every collateral movement logged against a named, authorised employee."
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-xl2 border border-gold-100 bg-white p-6 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                  <v.icon size={20} />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-light">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative h-72 overflow-hidden sm:h-96">
        <Image
          src={IMAGES.vaultDoor}
          alt="A steel bank vault door"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-navy-950/10" />
        <div className="container-page relative flex h-full items-end pb-10">
          <p className="max-w-md font-display text-2xl font-semibold text-white sm:text-3xl">
            Your gold doesn&apos;t just sit in a drawer. It&apos;s sealed, logged and vaulted.
          </p>
        </div>
      </section>

      <section id="regulatory" className="scroll-mt-24 bg-gold-50/60 py-20">
        <div className="container-page max-w-3xl">
          <SectionHeading eyebrow="Regulatory status" title="Where we are on licensing" />
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-light">
            <p>
              Goldnest is a newly formed secured-lending business. Before offering loans to the public, we are
              completing the applicable legal and regulatory process for this business, which may include NBFC
              registration with the Reserve Bank of India or state-specific money-lending registration, KYC/AML
              obligations, and other requirements as advised by our legal and compliance counsel.
            </p>
            <p>
              This website and app describe the product and platform we are building. No loan applications are
              processed, and no funds are disbursed, until the relevant licensing and compliance sign-off is
              complete. This page will be updated with our registration details once finalised.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

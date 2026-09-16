import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { documentsRequired } from '@/lib/content';
import { IdCard, Home, Camera } from 'lucide-react';

export const metadata: Metadata = { title: 'Documents Required' };

const GROUPS = [
  { icon: IdCard, title: 'Identity proof', items: documentsRequired.identity },
  { icon: Home, title: 'Address proof', items: documentsRequired.address },
  { icon: Camera, title: 'Photograph', items: documentsRequired.photo },
];

export default function DocumentsRequiredPage() {
  return (
    <>
      <PageHero eyebrow="Before you apply" title="Documents required" description="Have these ready and your KYC step takes minutes." />

      <section className="py-20">
        <div className="container-page grid gap-6 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="rounded-xl2 border border-gold-100 bg-white p-6 shadow-soft">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                <group.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{group.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-light">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="container-page mt-10">
          <div className="max-w-2xl rounded-xl2 border border-gold-200 bg-gold-50 p-6 text-sm leading-relaxed text-ink-light">
            {documentsRequired.notes}
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { Faq } from '@/components/Faq';
import { fullFaqs } from '@/lib/content';

export const metadata: Metadata = { title: 'FAQ' };

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="Support" title="Frequently asked questions" />
      <section className="py-20">
        <div className="container-page max-w-3xl">
          <Faq items={fullFaqs} />
        </div>
      </section>
    </>
  );
}

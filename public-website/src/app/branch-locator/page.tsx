import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { branches } from '@/lib/content';
import { BranchLocatorClient } from './BranchLocatorClient';

export const metadata: Metadata = { title: 'Branch Locator' };

export default function BranchLocatorPage() {
  return (
    <>
      <PageHero
        eyebrow="Visit us"
        title="Find a Goldnest branch"
        description="Every branch offers the same appraisal standards, pricing policy and vault security — pick whichever is most convenient."
      />
      <section className="py-16">
        <div className="container-page">
          <BranchLocatorClient branches={branches} />
        </div>
      </section>
    </>
  );
}

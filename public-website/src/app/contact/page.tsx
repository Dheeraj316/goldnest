import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';
import { ContactForm } from './ContactForm';
import { Mail, Phone, MapPin } from 'lucide-react';
import { COMPANY } from '@/lib/config';

export const metadata: Metadata = { title: 'Contact Us' };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Get in touch" title="Contact us" description="Questions about an application, a branch, or anything else." />

      <section className="py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading eyebrow="Reach us" title="Talk to our team" />
            <div className="mt-8 space-y-5">
              <div className="flex items-center gap-3 text-sm text-ink-light">
                <Phone size={17} className="text-gold-500" /> {COMPANY.supportPhone}
              </div>
              <div className="flex items-center gap-3 text-sm text-ink-light">
                <Mail size={17} className="text-gold-500" /> {COMPANY.supportEmail}
              </div>
              <div className="flex items-start gap-3 text-sm text-ink-light">
                <MapPin size={17} className="mt-0.5 shrink-0 text-gold-500" /> See the{' '}
                <a href="/branch-locator" className="text-gold-600 underline underline-offset-2">
                  branch locator
                </a>{' '}
                for addresses and hours.
              </div>
            </div>
            <p className="mt-8 text-sm leading-relaxed text-ink-light">
              For an existing loan or account, the fastest way to reach us is through the in-app support ticket,
              which routes directly to the branch handling your loan.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}

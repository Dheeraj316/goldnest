import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { LegalNotice } from '@/components/LegalNotice';
import { COMPANY } from '@/lib/config';

export const metadata: Metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" />
      <section className="py-20">
        <div className="container-page max-w-3xl">
          <LegalNotice />

          <div className="space-y-8 text-sm leading-relaxed text-ink-light">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">1. About this agreement</h2>
              <p className="mt-2">
                These terms govern your use of the Goldnest website and mobile applications, and your relationship
                with {COMPANY.legalName} (&quot;Goldnest&quot;, &quot;we&quot;, &quot;us&quot;). Separate terms specific to your loan are set out
                in your individual loan agreement, which takes precedence for matters relating to that loan.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">2. Eligibility & accounts</h2>
              <p className="mt-2">
                You must be at least 18 years old and able to enter into a binding contract to use our services.
                You&apos;re responsible for keeping your login credentials and devices secure, and for all activity
                under your account.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">3. Indicative figures</h2>
              <p className="mt-2">
                Any loan amount, interest rate, LTV or charge shown before your gold has been physically appraised
                and your application approved is indicative only. It does not constitute an offer or commitment
                and may differ from your final approved terms.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">4. Collateral</h2>
              <p className="mt-2">
                Gold jewellery pledged as collateral remains your property, held by us as security for your loan
                under the terms of your loan agreement, until the loan is repaid in full or the collateral is
                dealt with in accordance with the agreement (including any auction process, carried out only after
                required notice periods).
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">5. Acceptable use</h2>
              <p className="mt-2">
                You agree not to misuse our platform, attempt to bypass security controls, submit false
                information, or use the service for any unlawful purpose.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">6. Changes</h2>
              <p className="mt-2">
                We may update these terms from time to time; material changes will be notified through the app or
                by other reasonable means before they take effect.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">7. Contact</h2>
              <p className="mt-2">Questions about these terms can be sent to {COMPANY.supportEmail}.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

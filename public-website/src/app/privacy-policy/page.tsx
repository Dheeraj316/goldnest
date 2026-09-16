import type { Metadata } from 'next';
import { PageHero } from '@/components/PageHero';
import { LegalNotice } from '@/components/LegalNotice';
import { COMPANY } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="py-20">
        <div className="container-page max-w-3xl">
          <LegalNotice />

          <div className="prose-legal space-y-8 text-sm leading-relaxed text-ink-light">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">1. What we collect</h2>
              <p className="mt-2">
                To assess and manage a gold loan, we collect information including your name, contact details, date
                of birth, address, identity and address proof documents, photographs, and details of the gold
                jewellery you pledge (weight, purity, valuation, and photographs of each item). We collect only what
                is needed to process your application, verify your identity, and service your loan.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">2. How we use it</h2>
              <p className="mt-2">
                Your information is used to verify your identity (KYC), assess and manage your loan, calculate
                interest and charges, communicate with you about your account, meet legal and regulatory
                obligations, and investigate fraud or risk indicators. We do not sell your personal data.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">3. How we protect it</h2>
              <p className="mt-2">
                Sensitive identifiers (such as PAN or Aadhaar) are masked in our systems and the underlying values
                are encrypted; access to full KYC records is restricted by role and logged. Documents and
                photographs are stored in access-controlled storage, never publicly accessible. All administrative
                actions on your data are recorded in an audit trail.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">4. Who we share it with</h2>
              <p className="mt-2">
                We may share information with service providers who help us operate (such as payment gateways,
                SMS/communication providers, and cloud infrastructure providers) under confidentiality obligations,
                and with regulators or legal authorities where required by law.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">5. Data retention</h2>
              <p className="mt-2">
                We retain your information for as long as your account is active and for a period after closure as
                required by applicable law and regulatory record-keeping obligations. You may request details of
                what we hold, or request deletion where legally permitted, by contacting us.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">6. Your choices</h2>
              <p className="mt-2">
                You can review and update your profile information in the app, manage your logged-in devices, and
                contact us at any time with privacy questions or requests.
              </p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">7. Contact</h2>
              <p className="mt-2">Questions about this policy can be sent to {COMPANY.supportEmail}.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

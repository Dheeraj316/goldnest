import type { Metadata } from 'next';
import { Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import type { WebsiteEnquiry } from '@/lib/types';
import { EnquiryActions } from './EnquiryActions';

export const metadata: Metadata = { title: 'Website Enquiries' };

export default async function EnquiriesPage() {
  const enquiries = await apiFetch<WebsiteEnquiry[]>('/enquiries');
  const newCount = enquiries.filter((e) => e.status === 'NEW').length;

  return (
    <div>
      <PageHeader
        title="Website Enquiries"
        description={`${enquiries.length} enquir${enquiries.length === 1 ? 'y' : 'ies'} from the public site${newCount ? ` — ${newCount} new` : ''}`}
      />

      {enquiries.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-light">No enquiries submitted from the website yet.</div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((enquiry) => (
            <div key={enquiry.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-ink">{enquiry.name}</h3>
                    <StatusBadge status={enquiry.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-light">
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> {enquiry.email}
                    </span>
                    {enquiry.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {enquiry.phone}
                      </span>
                    )}
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 uppercase tracking-wide">{enquiry.sourcePage}</span>
                    <span>{new Date(enquiry.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <EnquiryActions id={enquiry.id} status={enquiry.status} />
              </div>
              <p className="mt-3 text-sm text-ink-light">{enquiry.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

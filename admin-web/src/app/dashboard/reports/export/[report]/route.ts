import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/config';
import { getAccessToken } from '@/lib/session';

// The browser can't attach the httpOnly access-token cookie to a request for the
// backend directly, so CSV downloads are proxied here: the token is read
// server-side, the backend enforces `report.view` and branch scope exactly as it
// does for the on-screen report, and the file is streamed straight back.
const REPORTS = new Set(['aging', 'branches', 'trend', 'auctions']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  if (!REPORTS.has(report)) return new NextResponse('Unknown report.', { status: 404 });

  const token = await getAccessToken();
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  const query = new URLSearchParams();
  const branchId = req.nextUrl.searchParams.get('branchId');
  if (branchId && UUID.test(branchId)) query.set('branchId', branchId);
  const days = Number(req.nextUrl.searchParams.get('days'));
  if (report === 'trend' && Number.isInteger(days) && days >= 7 && days <= 90) query.set('days', String(days));

  const res = await fetch(`${API_URL}/reports/${report}/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const status = res.status === 403 || res.status === 401 ? res.status : 502;
    return new NextResponse(status === 403 ? 'You do not have permission to export this report.' : 'The report could not be exported. Please try again.', { status });
  }
  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': res.headers.get('content-disposition') ?? `attachment; filename="goldnest-${report}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

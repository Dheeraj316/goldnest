import { API_URL } from './config';
import { branches as fallbackBranches, type Branch } from './content';

type PublicBranchResponse = {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  workingHours: { text?: string } | null;
};

// Real branch data from the same backend/database every other Goldnest app
// reads from. Falls back to the static placeholder network only if the
// backend is unreachable, so the page still renders for visitors.
export async function getPublicBranches(): Promise<Branch[]> {
  try {
    const res = await fetch(`${API_URL}/public/branches`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Branch lookup failed: ${res.status}`);
    const data: PublicBranchResponse[] = await res.json();
    const withCoordinates = data.filter((b) => b.latitude != null && b.longitude != null);
    if (withCoordinates.length === 0) return fallbackBranches;
    return withCoordinates.map((b) => ({
      code: b.code,
      name: b.name,
      city: b.city,
      state: b.state,
      address: b.address,
      phone: b.phone || 'Contact head office',
      hours: b.workingHours?.text || 'Mon–Sat, 9:30 AM – 6:30 PM',
      lat: Number(b.latitude),
      lng: Number(b.longitude),
    }));
  } catch {
    return fallbackBranches;
  }
}

import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Belt-and-braces: proxy.ts already gates /dashboard/**, but a Server
  // Component should never assume middleware ran — verify here too.
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-cream-100">
      <Sidebar permissions={user.permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

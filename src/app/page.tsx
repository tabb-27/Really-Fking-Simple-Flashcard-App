import { Suspense } from 'react';
import { isAdminAuthenticated } from '@/lib/auth';
import { fetchDashboardData } from '@/lib/data';
import { DashboardClient } from '@/components/DashboardClient';

async function DashboardLoader() {
  const [dashboard, isAdmin] = await Promise.all([
    fetchDashboardData(),
    isAdminAuthenticated(),
  ]);

  return (
    <DashboardClient
      configured={dashboard.configured}
      initialCollections={dashboard.collections}
      initialSets={dashboard.sets}
      initialIsAdmin={isAdmin}
      loadError={dashboard.error}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
          Loading flashcard library...
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  );
}

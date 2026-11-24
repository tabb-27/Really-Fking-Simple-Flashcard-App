import { Suspense } from 'react';
import Link from 'next/link';
import { isAdminAuthenticated } from '@/lib/auth';
import { fetchSetWithCards } from '@/lib/data';
import { StudyClient } from '@/components/StudyClient';

async function StudyLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, isAdmin] = await Promise.all([
    fetchSetWithCards(id),
    isAdminAuthenticated(),
  ]);

  if (!data.set) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Set not found</h1>
        <p className="mt-1 text-sm text-slate-500">
          This flashcard set may have been removed or Supabase is not
          configured.
        </p>
        <Link
          href="/"
          className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <StudyClient set={data.set} initialCards={data.cards} isAdmin={isAdmin} />
  );
}

export default function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
          Loading flashcards...
        </div>
      }
    >
      <StudyLoader params={params} />
    </Suspense>
  );
}

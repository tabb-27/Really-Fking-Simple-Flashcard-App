'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  Folder,
  FolderPlus,
  HelpCircle,
  Layers,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import type { Collection, FlashcardSet, SortOption } from '@/lib/types';
import { AdminPasscodeModal } from './AdminPasscodeModal';
import { BulkUploadModal } from './BulkUploadModal';
import { ModalDialog } from './ModalDialog';

interface DashboardClientProps {
  configured: boolean;
  initialCollections: Collection[];
  initialSets: FlashcardSet[];
  initialIsAdmin: boolean;
  loadError?: string;
}

export function DashboardClient({
  configured,
  initialCollections,
  initialSets,
  initialIsAdmin,
  loadError,
}: DashboardClientProps) {
  const router = useRouter();
  const [collections, setCollections] =
    useState<Collection[]>(initialCollections);
  const [sets, setSets] = useState<FlashcardSet[]>(initialSets);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);

  const [selectedCollectionId, setSelectedCollectionId] =
    useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Create / Rename Collection modal
  const [collectionModal, setCollectionModal] = useState<{
    open: boolean;
    mode: 'create' | 'rename';
    id?: string;
    name: string;
  }>({ open: false, mode: 'create', name: '' });

  // Create / Edit Set modal
  const [setModal, setSetModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    id?: string;
    title: string;
    collectionId: string;
  }>({ open: false, mode: 'create', title: '', collectionId: '' });

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Synced via refreshData() after admin mutations

  // Global Ctrl+Shift+A shortcut for hidden admin access
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isAdmin) {
          setPasscodeOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdmin]);

  const refreshData = async () => {
    const [colRes, setRes] = await Promise.all([
      fetch('/api/collections'),
      fetch('/api/sets'),
    ]);
    if (colRes.ok) {
      const colData = (await colRes.json()) as { collections: Collection[] };
      setCollections(colData.collections ?? []);
    }
    if (setRes.ok) {
      const setData = (await setRes.json()) as { sets: FlashcardSet[] };
      setSets(setData.sets ?? []);
    }
    router.refresh();
  };

  const handleLogoutAdmin = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsAdmin(false);
    router.refresh();
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = collectionModal.name.trim();
    if (!name) return;

    setBusy(true);
    setActionError(null);
    try {
      const url =
        collectionModal.mode === 'create'
          ? '/api/collections'
          : `/api/collections/${collectionModal.id}`;
      const method = collectionModal.mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? 'Failed to save collection.');
        return;
      }
      setCollectionModal({ open: false, mode: 'create', name: '' });
      await refreshData();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCollection = async (col: Collection) => {
    if (
      !window.confirm(
        `Delete collection "${col.name}"? Sets inside will be moved to Uncategorized.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/collections/${col.id}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedCollectionId === col.id) {
        setSelectedCollectionId('all');
      }
      await refreshData();
    }
  };

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = setModal.title.trim();
    if (!title) return;

    setBusy(true);
    setActionError(null);
    try {
      const url =
        setModal.mode === 'create' ? '/api/sets' : `/api/sets/${setModal.id}`;
      const method = setModal.mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          collection_id: setModal.collectionId || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? 'Failed to save set.');
        return;
      }
      setSetModal({
        open: false,
        mode: 'create',
        title: '',
        collectionId: '',
      });
      await refreshData();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSet = async (set: FlashcardSet) => {
    if (
      !window.confirm(
        `Delete "${set.title}" and all ${set.card_count} flashcards inside it?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/sets/${set.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    }
  };

  const filteredAndSortedSets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = sets.filter((set) => {
      if (selectedCollectionId === 'uncategorized') {
        if (set.collection_id !== null) return false;
      } else if (selectedCollectionId !== 'all') {
        if (set.collection_id !== selectedCollectionId) return false;
      }

      if (query) {
        const matchTitle = set.title.toLowerCase().includes(query);
        const matchCol = (set.collection_name ?? '')
          .toLowerCase()
          .includes(query);
        return matchTitle || matchCol;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'date_asc':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'alpha_asc':
          return a.title.localeCompare(b.title);
        case 'alpha_desc':
          return b.title.localeCompare(a.title);
      }
    });
  }, [sets, selectedCollectionId, searchQuery, sortBy]);

  const uncategorizedCount = useMemo(
    () => sets.filter((s) => s.collection_id === null).length,
    [sets]
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-slate-900">
                LingoCard
              </span>
              <span className="ml-2 hidden rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 sm:inline-block">
                EN ↔ VI
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Admin
              </span>
              <button
                type="button"
                onClick={() =>
                  setCollectionModal({
                    open: true,
                    mode: 'create',
                    name: '',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Collection</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSetModal({
                    open: true,
                    mode: 'create',
                    title: '',
                    collectionId:
                      selectedCollectionId !== 'all' &&
                      selectedCollectionId !== 'uncategorized'
                        ? selectedCollectionId
                        : '',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Set</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Upload className="h-3.5 w-3.5" />
                Bulk Upload
              </button>
              <button
                type="button"
                onClick={handleLogoutAdmin}
                title="Exit Admin Mode"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {!configured && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-sm font-semibold">
              Supabase Setup Required
            </h2>
            <p className="mt-1 text-sm text-amber-900">
              To connect your database, copy{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                .env.example
              </code>{' '}
              to{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                .env.local
              </code>
              , add your Supabase credentials and{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                ADMIN_CODE
              </code>
              , then run{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                supabase/schema.sql
              </code>{' '}
              and{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                supabase/seed.sql
              </code>{' '}
              in your Supabase SQL Editor.
            </p>
          </div>
        )}

        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Title + Search + Sort Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Flashcard Library
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose a set to study with 3D flashcards or test yourself with a
              multiple-choice quiz.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sets..."
                aria-label="Search sets"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-52"
              />
            </div>

            <div className="relative flex items-center">
              <ArrowUpDown className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort flashcard sets"
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
              >
                <option value="date_desc">Date: Newest first</option>
                <option value="date_asc">Date: Oldest first</option>
                <option value="alpha_asc">Alphabetical: A – Z</option>
                <option value="alpha_desc">Alphabetical: Z – A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collections Filter Pills */}
        <div className="mb-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCollectionId('all')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              selectedCollectionId === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Sets
            <span className="opacity-70">{sets.length}</span>
          </button>

          {collections.map((col) => {
            const count = sets.filter((s) => s.collection_id === col.id).length;
            const active = selectedCollectionId === col.id;
            return (
              <div
                key={col.id}
                className={`inline-flex items-center rounded-full border transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCollectionId(col.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium"
                >
                  <Folder className="h-3.5 w-3.5 opacity-75" />
                  {col.name}
                  <span className="opacity-70">{count}</span>
                </button>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 pr-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCollectionModal({
                          open: true,
                          mode: 'rename',
                          id: col.id,
                          name: col.name,
                        })
                      }
                      aria-label={`Rename ${col.name}`}
                      className="rounded-full p-1 opacity-70 transition hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(col)}
                      aria-label={`Delete ${col.name}`}
                      className="rounded-full p-1 opacity-70 transition hover:text-red-400 hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {uncategorizedCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCollectionId('uncategorized')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                selectedCollectionId === 'uncategorized'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Uncategorized
              <span className="opacity-70">{uncategorizedCount}</span>
            </button>
          )}
        </div>

        {/* Sets Grid */}
        {filteredAndSortedSets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <Layers className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 text-base font-semibold text-slate-800">
              No flashcard sets found
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? 'Try clearing your search filter.'
                : isAdmin
                  ? 'Create a new set or use Bulk Upload to get started.'
                  : 'Ask your instructor to add some flashcard sets.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedSets.map((set) => (
              <article
                key={set.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <Folder className="h-3 w-3 text-slate-400" />
                      {set.collection_name ?? 'Uncategorized'}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSetModal({
                              open: true,
                              mode: 'edit',
                              id: set.id,
                              title: set.title,
                              collectionId: set.collection_id ?? '',
                            })
                          }
                          aria-label={`Edit ${set.title}`}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(set)}
                          aria-label={`Delete ${set.title}`}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                    {set.title}
                  </h2>

                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {set.card_count} {set.card_count === 1 ? 'card' : 'cards'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={set.created_at}>
                      {new Date(set.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100">
                  <Link
                    href={`/sets/${set.id}/study`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Study
                  </Link>
                  <Link
                    href={`/sets/${set.id}/quiz`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Quiz
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Subtle Footer with Hidden Admin Lock Trigger */}
      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-slate-400 sm:px-6">
          <span>LingoCard · English–Vietnamese Flashcards</span>
          <button
            type="button"
            onClick={() =>
              isAdmin ? handleLogoutAdmin() : setPasscodeOpen(true)
            }
            title={
              isAdmin
                ? 'Admin Mode active (click to lock)'
                : 'Admin access (Ctrl+Shift+A)'
            }
            aria-label={isAdmin ? 'Lock admin mode' : 'Open admin login'}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            {isAdmin ? (
              <>
                <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Admin</span>
              </>
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </footer>

      {/* Modals */}
      <AdminPasscodeModal
        open={passcodeOpen}
        onClose={() => setPasscodeOpen(false)}
        onSuccess={() => {
          setIsAdmin(true);
          router.refresh();
        }}
      />

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        collections={collections}
        sets={sets}
        onSaved={refreshData}
      />

      {/* Collection Create/Rename Modal */}
      <ModalDialog
        open={collectionModal.open}
        onClose={() => {
          setActionError(null);
          setCollectionModal({ open: false, mode: 'create', name: '' });
        }}
        title={
          collectionModal.mode === 'create'
            ? 'New Collection'
            : 'Rename Collection'
        }
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleSaveCollection} className="space-y-4">
          <div>
            <label
              htmlFor="collection-name-input"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Collection Name
            </label>
            <input
              id="collection-name-input"
              type="text"
              autoFocus
              value={collectionModal.name}
              onChange={(e) =>
                setCollectionModal((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="e.g., Unit 1: Daily Essentials"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {actionError && (
            <p className="text-xs font-medium text-red-600">{actionError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setCollectionModal({ open: false, mode: 'create', name: '' })
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !collectionModal.name.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Set Create/Edit Modal */}
      <ModalDialog
        open={setModal.open}
        onClose={() => {
          setActionError(null);
          setSetModal({
            open: false,
            mode: 'create',
            title: '',
            collectionId: '',
          });
        }}
        title={setModal.mode === 'create' ? 'New Flashcard Set' : 'Edit Set'}
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleSaveSet} className="space-y-4">
          <div>
            <label
              htmlFor="set-title-input"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Set Title
            </label>
            <input
              id="set-title-input"
              type="text"
              autoFocus
              value={setModal.title}
              onChange={(e) =>
                setSetModal((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Common Verbs"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label
              htmlFor="set-collection-select"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Collection
            </label>
            <select
              id="set-collection-select"
              value={setModal.collectionId}
              onChange={(e) =>
                setSetModal((prev) => ({
                  ...prev,
                  collectionId: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Uncategorized</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
          {actionError && (
            <p className="text-xs font-medium text-red-600">{actionError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setSetModal({
                  open: false,
                  mode: 'create',
                  title: '',
                  collectionId: '',
                })
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !setModal.title.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

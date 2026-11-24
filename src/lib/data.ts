import { getPublicSupabase, isSupabaseConfigured } from './supabase';
import type { Collection, Flashcard, FlashcardSet } from './types';

export interface DashboardData {
  configured: boolean;
  collections: Collection[];
  sets: FlashcardSet[];
  error?: string;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) {
    return { configured: false, collections: [], sets: [] };
  }

  const supabase = getPublicSupabase();
  if (!supabase) {
    return { configured: false, collections: [], sets: [] };
  }

  const [collectionsRes, setsRes] = await Promise.all([
    supabase
      .from('collections')
      .select('id, name, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('sets')
      .select('id, collection_id, title, created_at, cards(count), collections(name)')
      .order('created_at', { ascending: false }),
  ]);

  if (collectionsRes.error || setsRes.error) {
    return {
      configured: true,
      collections: [],
      sets: [],
      error:
        collectionsRes.error?.message ??
        setsRes.error?.message ??
        'Failed to load data from Supabase.',
    };
  }

  const collections: Collection[] = collectionsRes.data ?? [];
  const sets: FlashcardSet[] = (setsRes.data ?? []).map((row) => {
    const countArr = row.cards as Array<{ count: number }> | undefined;
    const collectionObj = row.collections as
      | { name: string }
      | Array<{ name: string }>
      | null
      | undefined;

    const collectionName = Array.isArray(collectionObj)
      ? collectionObj[0]?.name ?? null
      : collectionObj?.name ?? null;

    return {
      id: row.id,
      collection_id: row.collection_id,
      title: row.title,
      created_at: row.created_at,
      card_count: countArr?.[0]?.count ?? 0,
      collection_name: collectionName,
    };
  });

  return { configured: true, collections, sets };
}

export async function fetchSetWithCards(setId: string): Promise<{
  configured: boolean;
  set: FlashcardSet | null;
  cards: Flashcard[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, set: null, cards: [] };
  }

  const supabase = getPublicSupabase();
  if (!supabase) {
    return { configured: false, set: null, cards: [] };
  }

  const [setRes, cardsRes] = await Promise.all([
    supabase
      .from('sets')
      .select('id, collection_id, title, created_at, collections(name)')
      .eq('id', setId)
      .maybeSingle(),
    supabase
      .from('cards')
      .select('id, set_id, english_word, vietnamese_meaning, example_usage, position, created_at')
      .eq('set_id', setId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (setRes.error || cardsRes.error) {
    return {
      configured: true,
      set: null,
      cards: [],
      error: setRes.error?.message ?? cardsRes.error?.message,
    };
  }

  if (!setRes.data) {
    return { configured: true, set: null, cards: [] };
  }

  const collectionObj = setRes.data.collections as
    | { name: string }
    | Array<{ name: string }>
    | null
    | undefined;
  const collectionName = Array.isArray(collectionObj)
    ? collectionObj[0]?.name ?? null
    : collectionObj?.name ?? null;

  const cards: Flashcard[] = cardsRes.data ?? [];

  return {
    configured: true,
    set: {
      id: setRes.data.id,
      collection_id: setRes.data.collection_id,
      title: setRes.data.title,
      created_at: setRes.data.created_at,
      card_count: cards.length,
      collection_name: collectionName,
    },
    cards,
  };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pencil,
  Plus,
  RotateCw,
  Shuffle,
  Trash2,
  Volume2,
} from 'lucide-react';
import { cacheCardsToWordPool, shuffleArray } from '@/lib/quiz';
import { speakEnglish } from '@/lib/speech';
import type { AccentOption, Flashcard, FlashcardSet } from '@/lib/types';
import { ModalDialog } from './ModalDialog';

interface StudyClientProps {
  set: FlashcardSet;
  initialCards: Flashcard[];
  isAdmin: boolean;
}

export function StudyClient({ set, initialCards, isAdmin }: StudyClientProps) {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [shuffled, setShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [accent, setAccent] = useState<AccentOption>('en-US');

  // Admin card modal state
  const [cardModal, setCardModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    id?: string;
    english_word: string;
    vietnamese_meaning: string;
    example_usage: string;
  }>({
    open: false,
    mode: 'create',
    english_word: '',
    vietnamese_meaning: '',
    example_usage: '',
  });
  const [savingCard, setSavingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => {
    cacheCardsToWordPool(cards);
  }, [cards]);

  const activeCards = useMemo(
    () => (shuffled ? shuffledOrder : cards),
    [shuffled, shuffledOrder, cards]
  );

  const currentCard = activeCards[currentIndex] ?? null;

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev;
      setIsFlipped(false);
      return prev - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= activeCards.length - 1) return prev;
      setIsFlipped(false);
      return prev + 1;
    });
  }, [activeCards.length]);

  const toggleFlip = useCallback(() => {
    if (activeCards.length === 0) return;
    setIsFlipped((prev) => !prev);
  }, [activeCards.length]);

  const handleToggleShuffle = () => {
    if (!shuffled) {
      setShuffledOrder(shuffleArray(cards));
      setShuffled(true);
    } else {
      setShuffled(false);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Keyboard shortcuts: Space to flip, Left/Right arrows to navigate
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (cardModal.open) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cardModal.open, toggleFlip, goPrev, goNext]);

  const refreshSetCards = async () => {
    const res = await fetch(`/api/sets/${set.id}`);
    if (res.ok) {
      const data = (await res.json()) as { cards: Flashcard[] };
      setCards(data.cards ?? []);
      setShuffled(false);
      setCurrentIndex((idx) =>
        Math.min(idx, Math.max(0, (data.cards?.length ?? 1) - 1))
      );
      setIsFlipped(false);
    }
    router.refresh();
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCard(true);
    setCardError(null);
    try {
      if (cardModal.mode === 'create') {
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId: set.id,
            cards: [
              {
                english_word: cardModal.english_word,
                vietnamese_meaning: cardModal.vietnamese_meaning,
                example_usage: cardModal.example_usage,
              },
            ],
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setCardError(data.error ?? 'Failed to add card.');
          return;
        }
      } else {
        const res = await fetch(`/api/cards/${cardModal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            english_word: cardModal.english_word,
            vietnamese_meaning: cardModal.vietnamese_meaning,
            example_usage: cardModal.example_usage,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setCardError(data.error ?? 'Failed to update card.');
          return;
        }
      }

      setCardModal({
        open: false,
        mode: 'create',
        english_word: '',
        vietnamese_meaning: '',
        example_usage: '',
      });
      await refreshSetCards();
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (card: Flashcard) => {
    if (!window.confirm(`Delete card "${card.english_word}"?`)) return;
    const res = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshSetCards();
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="min-w-0 text-center">
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
              {set.title}
            </h1>
            <p className="text-xs text-slate-500">
              {set.collection_name ?? 'Uncategorized'}
            </p>
          </div>

          <Link
            href={`/sets/${set.id}/quiz`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Quiz
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        {/* Study Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleShuffle}
              disabled={cards.length < 2}
              aria-pressed={shuffled}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                shuffled
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle {shuffled ? 'On' : 'Off'}
            </button>

            {/* US / UK Accent Toggle */}
            <div
              role="group"
              aria-label="Pronunciation accent"
              className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-medium"
            >
              <button
                type="button"
                onClick={() => setAccent('en-US')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  accent === 'en-US'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                US
              </button>
              <button
                type="button"
                onClick={() => setAccent('en-GB')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  accent === 'en-GB'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UK
              </button>
            </div>
          </div>

          <div className="text-sm font-semibold tabular-nums text-slate-600">
            {activeCards.length > 0
              ? `${currentIndex + 1} / ${activeCards.length}`
              : '0 / 0'}
          </div>
        </div>

        {/* 3D Flashcard Stage */}
        {currentCard ? (
          <>
            <div className="perspective-1000 w-full">
              <div
                role="button"
                tabIndex={0}
                onClick={toggleFlip}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    toggleFlip();
                  }
                }}
                aria-label={
                  isFlipped
                    ? 'Flashcard back face. Click or press Space to flip to front.'
                    : 'Flashcard front face. Click or press Space to flip to back.'
                }
                className={`transform-style-3d relative min-h-[300px] w-full cursor-pointer select-none transition-transform duration-500 sm:min-h-[340px] ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Face: English Word + Speaker */}
                <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      English
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEnglish(currentCard.english_word, accent);
                      }}
                      aria-label={`Pronounce ${currentCard.english_word}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="my-auto py-6 text-center">
                    <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                      {currentCard.english_word}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <RotateCw className="h-3.5 w-3.5" />
                    Click card or press Space to flip
                  </div>
                </div>

                {/* Back Face: Vietnamese Meaning + Example Usage + Speaker */}
                <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                      Vietnamese Meaning
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {currentCard.english_word}
                    </span>
                  </div>

                  <div className="my-auto space-y-5 py-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      {currentCard.vietnamese_meaning}
                    </p>

                    <div className="mx-auto flex max-w-xl items-center justify-center gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-left">
                      <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
                        &ldquo;{currentCard.example_usage}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglish(currentCard.example_usage, accent);
                        }}
                        aria-label="Pronounce example sentence"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <RotateCw className="h-3.5 w-3.5" />
                    Click card or press Space to flip back
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar & Left/Right Controls */}
            <div className="mt-6 space-y-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / activeCards.length) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="hidden text-xs text-slate-400 sm:inline">
                  Use ← / → arrow keys
                </span>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentIndex >= activeCards.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold text-slate-800">
              This set has no flashcards yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? 'Add a flashcard below to start studying.'
                : 'Ask your instructor to add cards to this set.'}
            </p>
          </div>
        )}

        {/* Admin Card Management Section */}
        {isAdmin && (
          <section className="mt-12 border-t border-slate-200 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Manage Cards ({cards.length})
              </h2>
              <button
                type="button"
                onClick={() =>
                  setCardModal({
                    open: true,
                    mode: 'create',
                    english_word: '',
                    vietnamese_meaning: '',
                    example_usage: '',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Card
              </button>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-start justify-between gap-4 px-4 py-3.5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {card.english_word}{' '}
                      <span className="font-normal text-slate-400">·</span>{' '}
                      <span className="font-medium text-indigo-700">
                        {card.vietnamese_meaning}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {card.example_usage}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCardModal({
                          open: true,
                          mode: 'edit',
                          id: card.id,
                          english_word: card.english_word,
                          vietnamese_meaning: card.vietnamese_meaning,
                          example_usage: card.example_usage,
                        })
                      }
                      aria-label={`Edit ${card.english_word}`}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card)}
                      aria-label={`Delete ${card.english_word}`}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-slate-400">
                  No cards in this set.
                </p>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Admin Add/Edit Card Modal */}
      <ModalDialog
        open={cardModal.open}
        onClose={() => {
          setCardError(null);
          setCardModal((prev) => ({ ...prev, open: false }));
        }}
        title={cardModal.mode === 'create' ? 'Add Flashcard' : 'Edit Flashcard'}
      >
        <form onSubmit={handleSaveCard} className="space-y-4">
          <div>
            <label
              htmlFor="card-english"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              English Word
            </label>
            <input
              id="card-english"
              type="text"
              autoFocus
              required
              value={cardModal.english_word}
              onChange={(e) =>
                setCardModal((prev) => ({
                  ...prev,
                  english_word: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label
              htmlFor="card-vietnamese"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Vietnamese Meaning
            </label>
            <input
              id="card-vietnamese"
              type="text"
              required
              value={cardModal.vietnamese_meaning}
              onChange={(e) =>
                setCardModal((prev) => ({
                  ...prev,
                  vietnamese_meaning: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label
              htmlFor="card-example"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Example Usage
            </label>
            <textarea
              id="card-example"
              rows={3}
              required
              value={cardModal.example_usage}
              onChange={(e) =>
                setCardModal((prev) => ({
                  ...prev,
                  example_usage: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {cardError && (
            <p className="text-xs font-medium text-red-600">{cardError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setCardModal((prev) => ({ ...prev, open: false }))
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCard}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {savingCard ? 'Saving...' : 'Save Card'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

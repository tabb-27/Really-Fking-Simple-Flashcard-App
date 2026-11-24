import type { Flashcard, QuizDirection, QuizQuestion } from './types';

const WORD_POOL_KEY = 'flashcard_word_pool_v1';

export interface PoolEntry {
  english_word: string;
  vietnamese_meaning: string;
}

const DEFAULT_FALLBACK_POOL: PoolEntry[] = [
  { english_word: 'analyze', vietnamese_meaning: 'phân tích' },
  { english_word: 'benefit', vietnamese_meaning: 'lợi ích' },
  { english_word: 'create', vietnamese_meaning: 'tạo ra' },
  { english_word: 'develop', vietnamese_meaning: 'phát triển' },
  { english_word: 'evaluate', vietnamese_meaning: 'đánh giá' },
  { english_word: 'focus', vietnamese_meaning: 'tập trung' },
  { english_word: 'generate', vietnamese_meaning: 'tạo ra, phát sinh' },
  { english_word: 'identify', vietnamese_meaning: 'nhận diện, xác định' },
];

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function cacheCardsToWordPool(cards: Flashcard[]): void {
  if (typeof window === 'undefined' || cards.length === 0) return;
  try {
    const existingRaw = window.localStorage.getItem(WORD_POOL_KEY);
    const existing: PoolEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
    const byWord = new Map<string, PoolEntry>();

    for (const item of existing) {
      if (item?.english_word && item?.vietnamese_meaning) {
        byWord.set(item.english_word.toLowerCase(), item);
      }
    }

    for (const card of cards) {
      byWord.set(card.english_word.toLowerCase(), {
        english_word: card.english_word,
        vietnamese_meaning: card.vietnamese_meaning,
      });
    }

    const merged = Array.from(byWord.values()).slice(-200);
    window.localStorage.setItem(WORD_POOL_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function getWordPoolFromStorage(): PoolEntry[] {
  if (typeof window === 'undefined') return DEFAULT_FALLBACK_POOL;
  try {
    const raw = window.localStorage.getItem(WORD_POOL_KEY);
    if (!raw) return DEFAULT_FALLBACK_POOL;
    const parsed: PoolEntry[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_FALLBACK_POOL;
    }
    return [...parsed, ...DEFAULT_FALLBACK_POOL];
  } catch {
    return DEFAULT_FALLBACK_POOL;
  }
}

export function generateQuizQuestions(
  cards: Flashcard[],
  direction: QuizDirection,
  fallbackPool: PoolEntry[]
): QuizQuestion[] {
  const shuffledCards = shuffleArray(cards);

  return shuffledCards.map((card) => {
    const itemDirection: 'en-vi' | 'vi-en' =
      direction === 'mixed'
        ? Math.random() < 0.5
          ? 'en-vi'
          : 'vi-en'
        : direction;

    const prompt =
      itemDirection === 'en-vi' ? card.english_word : card.vietnamese_meaning;
    const correctAnswer =
      itemDirection === 'en-vi' ? card.vietnamese_meaning : card.english_word;

    const sameSetCandidates = shuffleArray(
      cards
        .filter((other) => other.id !== card.id)
        .map((other) =>
          itemDirection === 'en-vi'
            ? other.vietnamese_meaning
            : other.english_word
        )
    );

    const fallbackCandidates = shuffleArray(
      fallbackPool.map((entry) =>
        itemDirection === 'en-vi'
          ? entry.vietnamese_meaning
          : entry.english_word
      )
    );

    const distractors: string[] = [];
    const seen = new Set<string>([correctAnswer.trim().toLowerCase()]);

    for (const candidate of [...sameSetCandidates, ...fallbackCandidates]) {
      const normalized = candidate.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      distractors.push(candidate.trim());
      if (distractors.length === 3) break;
    }

    const options = shuffleArray([correctAnswer, ...distractors]);

    return {
      cardId: card.id,
      direction: itemDirection,
      prompt,
      correctAnswer,
      options,
      exampleUsage: card.example_usage,
    };
  });
}

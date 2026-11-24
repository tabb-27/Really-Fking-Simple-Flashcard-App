export interface Collection {
  id: string;
  name: string;
  created_at: string;
}

export interface FlashcardSet {
  id: string;
  collection_id: string | null;
  title: string;
  created_at: string;
  card_count: number;
  collection_name?: string | null;
}

export interface Flashcard {
  id: string;
  set_id: string;
  english_word: string;
  vietnamese_meaning: string;
  example_usage: string;
  position: number;
  created_at: string;
}

export type SortOption = 'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc';

export type AccentOption = 'en-US' | 'en-GB';

export type QuizDirection = 'en-vi' | 'vi-en' | 'mixed';

export interface ParsedCardInput {
  english_word: string;
  vietnamese_meaning: string;
  example_usage: string;
}

export interface BulkLineResult {
  lineNumber: number;
  raw: string;
  valid: boolean;
  error?: string;
  parsed?: ParsedCardInput;
}

export interface QuizQuestion {
  cardId: string;
  direction: 'en-vi' | 'vi-en';
  prompt: string;
  correctAnswer: string;
  options: string[];
  exampleUsage: string;
}

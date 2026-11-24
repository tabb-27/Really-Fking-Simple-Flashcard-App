import type { BulkLineResult } from './types';

/**
 * Parses bulk flashcard text formatted line-by-line as:
 *   English word : Vietnamese meaning + Example usage
 * Empty lines are ignored.
 */
export function parseBulkFlashcards(input: string): {
  results: BulkLineResult[];
  validCount: number;
  errorCount: number;
} {
  const lines = input.split(/\r?\n/);
  const results: BulkLineResult[] = [];
  let validCount = 0;
  let errorCount = 0;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      return;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      errorCount += 1;
      results.push({
        lineNumber,
        raw: trimmed,
        valid: false,
        error: `Line ${lineNumber}: Missing ':' separator`,
      });
      return;
    }

    const englishWord = trimmed.slice(0, colonIndex).trim();
    if (!englishWord) {
      errorCount += 1;
      results.push({
        lineNumber,
        raw: trimmed,
        valid: false,
        error: `Line ${lineNumber}: Missing English word before ':'`,
      });
      return;
    }

    const rest = trimmed.slice(colonIndex + 1);
    const plusIndex = rest.indexOf('+');
    if (plusIndex === -1) {
      errorCount += 1;
      results.push({
        lineNumber,
        raw: trimmed,
        valid: false,
        error: `Line ${lineNumber}: Missing '+' for example`,
      });
      return;
    }

    const vietnameseMeaning = rest.slice(0, plusIndex).trim();
    if (!vietnameseMeaning) {
      errorCount += 1;
      results.push({
        lineNumber,
        raw: trimmed,
        valid: false,
        error: `Line ${lineNumber}: Missing Vietnamese meaning between ':' and '+'`,
      });
      return;
    }

    const exampleUsage = rest.slice(plusIndex + 1).trim();
    if (!exampleUsage) {
      errorCount += 1;
      results.push({
        lineNumber,
        raw: trimmed,
        valid: false,
        error: `Line ${lineNumber}: Missing example usage after '+'`,
      });
      return;
    }

    validCount += 1;
    results.push({
      lineNumber,
      raw: trimmed,
      valid: true,
      parsed: {
        english_word: englishWord,
        vietnamese_meaning: vietnameseMeaning,
        example_usage: exampleUsage,
      },
    });
  });

  return { results, validCount, errorCount };
}

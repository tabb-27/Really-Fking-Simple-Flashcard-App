'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Shuffle,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  cacheCardsToWordPool,
  generateQuizQuestions,
  getWordPoolFromStorage,
} from '@/lib/quiz';
import type {
  Flashcard,
  FlashcardSet,
  QuizDirection,
  QuizQuestion,
} from '@/lib/types';

interface QuizClientProps {
  set: FlashcardSet;
  cards: Flashcard[];
}

export function QuizClient({ set, cards }: QuizClientProps) {
  const [direction, setDirection] = useState<QuizDirection | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    cacheCardsToWordPool(cards);
  }, [cards]);

  const startQuiz = (chosenDirection: QuizDirection) => {
    const pool = getWordPoolFromStorage();
    const generated = generateQuizQuestions(cards, chosenDirection, pool);
    setDirection(chosenDirection);
    setQuestions(generated);
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setFinished(false);
  };

  const currentQuestion = questions[currentIndex] ?? null;

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(option);
    if (option === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    }
  }, [selectedOption, currentIndex, questions.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedOption !== null && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedOption, handleNext]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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
              {set.title} · Quiz
            </h1>
            <p className="text-xs text-slate-500">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </p>
          </div>

          <Link
            href={`/sets/${set.id}/study`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Study
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold text-slate-800">
              No flashcards in this set yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Add at least one card before starting a quiz.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Back to Library
            </Link>
          </div>
        ) : !direction ? (
          /* Direction Selector */
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Choose Quiz Direction
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Test your recall across all {cards.length}{' '}
              {cards.length === 1 ? 'card' : 'cards'} in this set.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => startQuiz('en-vi')}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    English → Vietnamese
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    See the English word, pick the Vietnamese meaning
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => startQuiz('vi-en')}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Vietnamese → English
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    See the Vietnamese meaning, pick the English word
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => startQuiz('mixed')}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Shuffle className="h-4 w-4 text-indigo-600" />
                    Mixed
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Randomly alternates between English → Vietnamese and
                    Vietnamese → English
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        ) : finished ? (
          /* Final Score Summary */
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Trophy className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Quiz Complete!
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You scored{' '}
              <span className="font-semibold text-slate-900">
                {score} out of {questions.length}
              </span>{' '}
              ({Math.round((score / questions.length) * 100)}%)
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => startQuiz(direction)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Retry Quiz
              </button>
              <button
                type="button"
                onClick={() => setDirection(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Change Mode
              </button>
              <Link
                href={`/sets/${set.id}/study`}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Review Flashcards
              </Link>
            </div>
          </div>
        ) : currentQuestion ? (
          /* Active Question */
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span>
                Score: {score} / {currentIndex + (selectedOption ? 1 : 0)}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {currentQuestion.direction === 'en-vi'
                  ? 'English → Vietnamese'
                  : 'Vietnamese → English'}
              </span>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {currentQuestion.prompt}
              </h2>

              <div className="mt-6 grid gap-3">
                {currentQuestion.options.map((option) => {
                  const isAnswered = selectedOption !== null;
                  const isCorrect = option === currentQuestion.correctAnswer;
                  const isSelected = option === selectedOption;

                  let buttonStyle =
                    'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-slate-50';
                  if (isAnswered) {
                    if (isCorrect) {
                      buttonStyle =
                        'border-emerald-500 bg-emerald-50 text-emerald-900';
                    } else if (isSelected && !isCorrect) {
                      buttonStyle = 'border-red-500 bg-red-50 text-red-900';
                    } else {
                      buttonStyle =
                        'border-slate-200 bg-slate-50/50 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(option)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition sm:text-base ${buttonStyle}`}
                    >
                      <span>{option}</span>
                      {isAnswered && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="mt-6 flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                  <p className="text-xs italic text-slate-500">
                    Example: &ldquo;{currentQuestion.exampleUsage}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {currentIndex + 1 >= questions.length
                      ? 'See Results'
                      : 'Next Question'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

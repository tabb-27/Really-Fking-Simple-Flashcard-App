'use client';

import { useId, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Upload } from 'lucide-react';
import { parseBulkFlashcards } from '@/lib/bulk-parser';
import type { Collection, FlashcardSet } from '@/lib/types';
import { ModalDialog } from './ModalDialog';

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  collections: Collection[];
  sets: FlashcardSet[];
  defaultSetId?: string;
  onSaved: () => void;
}

const SAMPLE_PLACEHOLDER = `accomplish : hoàn thành, đạt được + She worked hard to accomplish her goals.
resilient : kiên cường + Coastal communities must build resilient infrastructure.`;

export function BulkUploadModal({
  open,
  onClose,
  collections,
  sets,
  defaultSetId,
  onSaved,
}: BulkUploadModalProps) {
  const tableCaptionId = useId();
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>(
    defaultSetId ? 'existing' : sets.length > 0 ? 'new' : 'new'
  );
  const [selectedSetId, setSelectedSetId] = useState<string>(
    defaultSetId ?? sets[0]?.id ?? ''
  );
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetCollectionId, setNewSetCollectionId] = useState<string>('');
  const [rawText, setRawText] = useState('');
  const [importValidOnly, setImportValidOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const parsed = useMemo(() => parseBulkFlashcards(rawText), [rawText]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    e.target.value = '';
  };

  const canSave =
    parsed.validCount > 0 &&
    (parsed.errorCount === 0 || importValidOnly) &&
    (targetMode === 'existing'
      ? Boolean(selectedSetId)
      : Boolean(newSetTitle.trim())) &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setServerError(null);

    const cardsToSave = parsed.results
      .filter((r) => r.valid && r.parsed)
      .map((r) => r.parsed!);

    try {
      const payload =
        targetMode === 'existing'
          ? { setId: selectedSetId, cards: cardsToSave }
          : {
              newSetTitle: newSetTitle.trim(),
              collectionId: newSetCollectionId || null,
              cards: cardsToSave,
            };

      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setServerError(data.error ?? 'Failed to save flashcards.');
        return;
      }

      setRawText('');
      setNewSetTitle('');
      setImportValidOnly(false);
      onSaved();
      onClose();
    } catch {
      setServerError('Network error while saving cards.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Bulk Upload Flashcards"
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Destination Selector */}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTargetMode('new')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                targetMode === 'new'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Create New Set
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('existing')}
              disabled={sets.length === 0}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                targetMode === 'existing'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Add to Existing Set
            </button>
          </div>

          {targetMode === 'new' ? (
            <>
              <div>
                <label
                  htmlFor="bulk-new-set-title"
                  className="mb-1 block text-xs font-medium text-slate-600"
                >
                  New Set Title
                </label>
                <input
                  id="bulk-new-set-title"
                  type="text"
                  value={newSetTitle}
                  onChange={(e) => setNewSetTitle(e.target.value)}
                  placeholder="e.g., Unit 2: Travel & Culture"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label
                  htmlFor="bulk-new-set-collection"
                  className="mb-1 block text-xs font-medium text-slate-600"
                >
                  Collection
                </label>
                <select
                  id="bulk-new-set-collection"
                  value={newSetCollectionId}
                  onChange={(e) => setNewSetCollectionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Uncategorized</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <label
                htmlFor="bulk-existing-set"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Target Set
              </label>
              <select
                id="bulk-existing-set"
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.card_count} cards)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Input Area + .txt Upload */}
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="bulk-textarea"
              className="text-xs font-medium text-slate-600"
            >
              Format:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
                English word : Vietnamese meaning + Example usage
              </code>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
              <FileUp className="h-3.5 w-3.5" />
              Upload .txt
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            id="bulk-textarea"
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={SAMPLE_PLACEHOLDER}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Live Validation Summary & Preview Table */}
        {parsed.results.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span
                  id={tableCaptionId}
                  className="text-slate-600 font-semibold"
                >
                  Live Validation Preview
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {parsed.validCount} valid
                </span>
                {parsed.errorCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-red-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {parsed.errorCount}{' '}
                    {parsed.errorCount === 1 ? 'error' : 'errors'}
                  </span>
                )}
              </div>

              {parsed.errorCount > 0 && (
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={importValidOnly}
                    onChange={(e) => setImportValidOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Import valid lines only
                </label>
              )}
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-labelledby={tableCaptionId}
              className="table-wrapper rounded-xl border border-slate-200 bg-white"
            >
              <table className="validation-table text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Line
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Word
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Meaning
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsed.results.map((row) =>
                    row.valid && row.parsed ? (
                      <tr key={row.lineNumber} className="hover:bg-slate-50/70">
                        <td
                          data-label="Line"
                          className="px-3 py-2 font-mono text-slate-400"
                        >
                          {row.lineNumber}
                        </td>
                        <td
                          data-label="Word"
                          className="px-3 py-2 font-medium text-slate-900"
                        >
                          {row.parsed.english_word}
                        </td>
                        <td
                          data-label="Meaning"
                          className="px-3 py-2 text-slate-700"
                        >
                          {row.parsed.vietnamese_meaning}
                        </td>
                        <td
                          data-label="Example"
                          className="px-3 py-2 text-slate-600"
                        >
                          {row.parsed.example_usage}
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.lineNumber} className="bg-red-50/80">
                        <td
                          data-label="Line"
                          className="px-3 py-2 font-mono font-semibold text-red-700"
                        >
                          {row.lineNumber}
                        </td>
                        <td
                          data-label="Error"
                          colSpan={3}
                          className="px-3 py-2 font-medium text-red-700"
                        >
                          {row.error}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Upload className="h-4 w-4" />
            {saving
              ? 'Saving...'
              : `Save ${parsed.validCount} ${parsed.validCount === 1 ? 'Card' : 'Cards'}`}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

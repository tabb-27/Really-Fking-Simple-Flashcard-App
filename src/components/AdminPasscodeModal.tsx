'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { ModalDialog } from './ModalDialog';

interface AdminPasscodeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminPasscodeModal({
  open,
  onClose,
  onSuccess,
}: AdminPasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the admin passcode.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const data = (await res.json()) as { isAdmin?: boolean; error?: string };
      if (!res.ok || !data.isAdmin) {
        setError(data.error ?? 'Invalid passcode.');
        return;
      }

      setPasscode('');
      onSuccess();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={() => {
        setError(null);
        setPasscode('');
        onClose();
      }}
      title="Admin Access"
      maxWidthClass="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter the admin passcode to create, edit, or bulk-import flashcards.
        </p>

        <div>
          <label
            htmlFor="admin-passcode-input"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
          >
            Passcode
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="admin-passcode-input"
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Unlock Admin'}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

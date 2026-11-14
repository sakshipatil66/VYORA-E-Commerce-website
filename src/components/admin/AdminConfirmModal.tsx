import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface AdminConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  notice?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  initialInputValue?: string;
  busy?: boolean;
  onConfirm: (inputValue: string) => void | Promise<void>;
  onCancel: () => void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  open,
  title,
  description,
  notice,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep as is',
  tone = 'danger',
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  initialInputValue = '',
  busy = false,
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState(initialInputValue);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setInputValue(initialInputValue);
      setError('');
    }
  }, [open, initialInputValue]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (inputLabel && inputRequired && !trimmed) {
      setError('Please enter a reason before continuing.');
      return;
    }
    setError('');
    void onConfirm(trimmed);
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/60 p-4 backdrop-blur-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vyora-confirm-title"
        className="w-full max-w-md rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-6 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                tone === 'danger' ? 'bg-rose-50 text-rose-700' : 'bg-[#f6e9eb] text-[#5b112b]'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="vyora-confirm-title" className="font-serif text-xl text-[#341016]">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-[#6b5a52]">{description}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              aria-label="Close confirmation"
              onClick={onCancel}
              className="rounded-full p-1.5 text-[#806f65] hover:bg-[#f5eee8] disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {notice && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-900">
              {notice}
            </div>
          )}

          {inputLabel && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#79675e]">
                {inputLabel}
                {inputRequired ? ' *' : ''}
              </label>
              <textarea
                rows={2}
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  if (error) setError('');
                }}
                placeholder={inputPlaceholder}
                className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] focus:ring-2 focus:ring-[#8c3448]/10"
              />
              {error && <p className="mt-1 text-[11px] text-rose-700">{error}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec] disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-60 ${
                tone === 'danger'
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-[#5b112b] hover:bg-[#42101f]'
              }`}
            >
              {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

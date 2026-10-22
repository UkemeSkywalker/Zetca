'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Modal } from './Modal';

/** Asks before a delete or remove, saying plainly what will happen */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  /** Throw to show the error in the dialog */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => !busy && onClose()}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#c7c4d8]/60 bg-white px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm text-on-surface space-y-2">{message}</div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}

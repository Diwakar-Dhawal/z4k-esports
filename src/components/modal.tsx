"use client";

import { ReactNode, useState } from "react";
import { Button, Spinner } from "@/components/ui";

/** Themed modal shell — replaces native confirm/alert and inline far-below forms. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Themed confirmation dialog — consistent replacement for window.confirm(). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-zinc-400">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
          {busy ? <Spinner /> : null} {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** Hook: `ask(title, body, action)` returns a themed confirm dialog + triggers. */
export function useConfirm() {
  const [state, setState] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    action: () => void | Promise<void>;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  function ask(
    title: string,
    body: string,
    action: () => void | Promise<void>,
    confirmLabel = "Delete",
  ) {
    setState({ title, body, action, confirmLabel });
  }

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      title={state?.title ?? ""}
      body={state?.body ?? ""}
      confirmLabel={state?.confirmLabel ?? "Delete"}
      busy={busy}
      onClose={() => setState(null)}
      onConfirm={async () => {
        if (!state) return;
        setBusy(true);
        try {
          await state.action();
        } finally {
          setBusy(false);
          setState(null);
        }
      }}
    />
  );

  return { ask, dialog };
}

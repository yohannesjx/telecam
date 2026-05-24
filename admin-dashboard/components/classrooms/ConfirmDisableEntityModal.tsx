"use client";

import { Button } from "@/components/ui/button";

type ConfirmDisableEntityModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
};

export function ConfirmDisableEntityModal({
  open,
  title,
  description,
  confirmLabel = "Disable",
  onClose,
  onConfirm,
  isPending = false,
}: ConfirmDisableEntityModalProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close confirmation"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Saving..." : confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

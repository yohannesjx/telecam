"use client";

import { Button } from "@/components/ui/button";
import type { NormalizedCamera } from "@/lib/admin/cameras-types";

type ConfirmDisableCameraModalProps = {
  camera: NormalizedCamera | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
};

export function ConfirmDisableCameraModal({
  camera,
  open,
  onClose,
  onConfirm,
  isPending = false,
}: ConfirmDisableCameraModalProps) {
  if (!open || !camera) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close disable confirmation"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Disable camera?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Disabling <span className="font-medium text-foreground">{camera.name}</span> stops live
          streaming for this camera until it is enabled again.
        </p>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Disabling..." : "Disable camera"}
          </Button>
        </div>
      </div>
    </>
  );
}

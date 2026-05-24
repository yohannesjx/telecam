"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useForcePasswordChangeMutation } from "@/lib/admin/use-users-queries";

type ForcePasswordChangeDialogProps = {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ForcePasswordChangeDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: ForcePasswordChangeDialogProps) {
  const mutation = useForcePasswordChangeMutation();

  const handleClose = () => onOpenChange(false);

  const handleConfirm = () => {
    mutation.mutate(
      { userId, force: true },
      {
        onSuccess: () => handleClose(),
      },
    );
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={handleClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">Force password change</h2>
            <p className="text-sm text-muted-foreground">
              {userName} will be required to change their password on next login.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 p-6">
          {mutation.isError ? (
            <p className="text-sm text-destructive">Could not update password requirement.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Require change"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

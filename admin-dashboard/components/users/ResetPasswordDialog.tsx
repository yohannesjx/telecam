"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetUserPasswordMutation } from "@/lib/admin/use-users-queries";

const schema = z.object({
  mode: z.enum(["generate", "manual"]),
  temporary_password: z.string().optional(),
  force_change: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type ResetPasswordDialogProps = {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ResetPasswordDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const mutation = useResetUserPasswordMutation();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "generate", temporary_password: "", force_change: true },
  });

  const mode = form.watch("mode");

  const handleClose = () => {
    form.reset();
    setGeneratedPassword(null);
    onOpenChange(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    const input =
      values.mode === "generate"
        ? { generate: true, force_change: values.force_change }
        : {
            temporary_password: values.temporary_password ?? "",
            force_change: values.force_change,
          };

    mutation.mutate(
      { userId, input },
      {
        onSuccess: (result) => {
          if (result.temporaryPassword) {
            setGeneratedPassword(result.temporaryPassword);
          } else {
            handleClose();
          }
        },
      },
    );
  });

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
            <h2 className="text-lg font-semibold">Reset password</h2>
            <p className="text-sm text-muted-foreground">
              Reset the password for {userName}. The temporary password is shown once only.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {generatedPassword ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this temporary password now. It will not be shown again.
              </p>
              <Input readOnly value={generatedPassword} className="font-mono" />
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Password source</Label>
                <select
                  className="h-9 w-full rounded-md border px-3 text-sm"
                  {...form.register("mode")}
                >
                  <option value="generate">Generate secure password</option>
                  <option value="manual">Set temporary password manually</option>
                </select>
              </div>

              {mode === "manual" ? (
                <div className="space-y-2">
                  <Label htmlFor="temporary_password">Temporary password</Label>
                  <Input
                    id="temporary_password"
                    type="password"
                    minLength={8}
                    {...form.register("temporary_password")}
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("force_change")} />
                Require password change on next login
              </label>

              {mutation.isError ? (
                <p className="text-sm text-destructive">Could not reset password.</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Resetting…" : "Reset password"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </aside>
    </>
  );
}

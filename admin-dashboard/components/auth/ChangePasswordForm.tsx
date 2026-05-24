"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { publicRoutes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.new_password !== data.current_password, {
    message: "New password must differ from current password",
    path: ["new_password"],
  });

type FormValues = z.infer<typeof schema>;

type ChangePasswordFormProps = {
  forced?: boolean;
};

export function ChangePasswordForm({ forced = false }: ChangePasswordFormProps) {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword(values.current_password, values.new_password);
      router.replace(publicRoutes.dashboard);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        return;
      }
      setFormError("Could not change password.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-5">
      {forced ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          You must change your password before continuing.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="current_password">Current password</Label>
        <div className="relative">
          <Input
            id="current_password"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            {...form.register("current_password")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowCurrent((v) => !v)}
            aria-label={showCurrent ? "Hide password" : "Show password"}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.current_password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.current_password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new_password">New password</Label>
        <div className="relative">
          <Input
            id="new_password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            className="pr-10"
            {...form.register("new_password")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.new_password ? (
          <p className="text-sm text-destructive">{form.formState.errors.new_password.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          {...form.register("confirm_password")}
        />
        {form.formState.errors.confirm_password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.confirm_password.message}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

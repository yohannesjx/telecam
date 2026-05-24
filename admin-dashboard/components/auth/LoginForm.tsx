"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import {
  DASHBOARD_ACCESS_DENIED_MESSAGE,
  GENERIC_LOGIN_ERROR,
} from "@/lib/auth/types";
import { publicRoutes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email.trim(), values.password);
      router.replace(publicRoutes.dashboard);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setFormError(DASHBOARD_ACCESS_DENIED_MESSAGE);
        return;
      }
      setFormError(GENERIC_LOGIN_ERROR);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@school.edu"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          className="h-10 border-slate-200 bg-slate-50/50"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-700">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            className="h-10 border-slate-200 bg-slate-50/50 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      {formError ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-10 w-full bg-indigo-600 hover:bg-indigo-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

import { Camera, ShieldCheck } from "lucide-react";

import { GuestOnly } from "@/lib/auth/guards";
import { APP_NAME } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";
import { SectionCard } from "@/components/ui/section-card";

export default function LoginPage() {
  return (
    <GuestOnly>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/60 via-slate-50 to-slate-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"
        />

        <div className="relative w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200/60">
              <Camera className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {APP_NAME}
              </h1>
              <p className="text-sm text-slate-500">
                Secure operations dashboard for school camera monitoring.
              </p>
            </div>
          </div>

          <SectionCard
            title="Admin login"
            description="Sign in with your school camera platform admin account."
            animate={false}
            contentClassName="pt-0"
          >
            <LoginForm />
          </SectionCard>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Encrypted session · Role-based access</span>
          </div>
        </div>
      </div>
    </GuestOnly>
  );
}

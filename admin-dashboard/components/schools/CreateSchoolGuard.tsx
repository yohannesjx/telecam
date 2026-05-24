"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { useCan } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth/auth-context";

export function CreateSchoolGuard({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const router = useRouter();
  const allowed = useCan("schools:create");

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace("/schools");
    }
  }, [allowed, isLoading, router]);

  if (isLoading) return null;
  if (!allowed) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

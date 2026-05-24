"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import { isProtectedPath, publicRoutes } from "@/lib/routes";

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-background p-8 shadow-sm">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && isProtectedPath(pathname)) {
      router.replace(publicRoutes.login);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <SessionLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(publicRoutes.dashboard);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <SessionLoading />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

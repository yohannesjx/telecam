"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import { isProtectedPath, publicRoutes } from "@/lib/routes";

const CHANGE_PASSWORD_PATH = publicRoutes.changePassword;

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
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const mustChangePassword = user?.force_password_change === true;
  const isChangePasswordRoute =
    pathname === CHANGE_PASSWORD_PATH || pathname.startsWith(`${CHANGE_PASSWORD_PATH}/`);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && isProtectedPath(pathname)) {
      router.replace(publicRoutes.login);
      return;
    }
    if (isAuthenticated && mustChangePassword && isProtectedPath(pathname) && !isChangePasswordRoute) {
      router.replace(CHANGE_PASSWORD_PATH);
    }
  }, [isAuthenticated, isChangePasswordRoute, isLoading, mustChangePassword, pathname, router]);

  if (isLoading) {
    return <SessionLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (mustChangePassword && isProtectedPath(pathname) && !isChangePasswordRoute) {
    return null;
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.force_password_change) {
        router.replace(CHANGE_PASSWORD_PATH);
      } else {
        router.replace(publicRoutes.dashboard);
      }
    }
  }, [isAuthenticated, isLoading, router, user?.force_password_change]);

  if (isLoading) {
    return <SessionLoading />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

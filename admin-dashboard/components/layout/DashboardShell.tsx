"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Topbar } from "@/components/layout/Topbar";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { MotionFadeIn } from "@/components/ui/motion";
import { appBackground, pageContainer } from "@/lib/ui/surface";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

function DashboardShellInner({
  children,
  title,
  subtitle,
}: DashboardShellProps) {
  const { mobileOpen, closeMobile } = useSidebar();

  return (
    <div className={appBackground}>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
          onClick={closeMobile}
        />
      ) : null}

      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar title={title} subtitle={subtitle} />
          <main className="flex-1 overflow-auto">
            <MotionFadeIn className={cn(pageContainer)}>
              <RequirePermission>{children}</RequirePermission>
            </MotionFadeIn>
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardShellInner {...props} />
    </SidebarProvider>
  );
}

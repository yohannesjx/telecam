import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_ACCESS_DENIED_MESSAGE } from "@/lib/auth/forbidden";
import { publicRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type AccessDeniedProps = {
  message?: string;
};

export function AccessDenied({
  message = PAGE_ACCESS_DENIED_MESSAGE,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState
        icon={ShieldOff}
        title="Access denied"
        description={message}
        className="w-full max-w-lg"
      />
      <Link href={publicRoutes.dashboard} className={cn(buttonVariants())}>
        Go to dashboard
      </Link>
    </div>
  );
}

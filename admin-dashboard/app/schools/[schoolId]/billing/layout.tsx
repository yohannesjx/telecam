import type { ReactNode } from "react";

import { RequireAuth } from "@/lib/auth/guards";

export default function SchoolBillingLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

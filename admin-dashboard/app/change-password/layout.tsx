import type { ReactNode } from "react";

import { RequireAuth } from "@/lib/auth/guards";

export default function ChangePasswordLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

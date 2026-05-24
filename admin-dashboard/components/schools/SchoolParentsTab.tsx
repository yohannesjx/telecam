import Link from "next/link";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SchoolParentsTab() {
  return (
    <div className="surface-card p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Users className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-medium">Parents are managed globally</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Open the Parents page to create and link parent accounts.
      </p>
      <Link href="/parents">
        <Button className="mt-4">Open Parents</Button>
      </Link>
    </div>
  );
}

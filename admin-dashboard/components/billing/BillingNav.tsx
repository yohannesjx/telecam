"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/billing/subscriptions", label: "Subscriptions" },
  { href: "/billing/payments", label: "Payments" },
  { href: "/billing/invoices", label: "Invoices" },
] as const;

export function BillingNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b pb-2">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

import Link from "next/link";

type Crumb = { label: string; href?: string };

export function SchoolBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="mx-2">→</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

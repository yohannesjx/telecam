import { cn } from "@/lib/utils";
import { surfaceTable } from "@/lib/ui/surface";
import { EmptyState } from "@/components/ui/empty-state";

type DataTableRootProps = {
  children: React.ReactNode;
  className?: string;
};

export function DataTableRoot({ children, className }: DataTableRootProps) {
  return (
    <div className={cn(surfaceTable, className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

type DataTableProps = React.ComponentProps<"table">;

export function DataTable({ className, ...props }: DataTableProps) {
  return (
    <table
      className={cn("w-full min-w-[640px] caption-bottom text-sm", className)}
      {...props}
    />
  );
}

export function DataTableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm [&_tr]:border-0",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function DataTableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors hover:bg-slate-50/80",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle text-sm text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

type DataTableEmptyProps = {
  filtered?: boolean;
  title?: string;
  description?: string;
  onClearFilters?: () => void;
};

export function DataTableEmpty({
  filtered,
  title,
  description,
  onClearFilters,
}: DataTableEmptyProps) {
  return (
    <EmptyState
      filtered={filtered}
      title={title}
      description={description}
      onClearFilters={onClearFilters}
      className="rounded-none border-0 shadow-none"
    />
  );
}

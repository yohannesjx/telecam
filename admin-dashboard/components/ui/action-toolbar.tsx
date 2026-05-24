import { cn } from "@/lib/utils";
import { surfaceFilter } from "@/lib/ui/surface";

type ActionToolbarProps = {
  children: React.ReactNode;
  className?: string;
};

export function ActionToolbar({ children, className }: ActionToolbarProps) {
  return (
    <div
      className={cn(
        surfaceFilter,
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ActionToolbarGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

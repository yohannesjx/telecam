type ListResultsMetaProps = {
  total: number;
  rangeStart: number;
  rangeEnd: number;
  filtered?: boolean;
  className?: string;
};

export function ListResultsMeta({
  total,
  rangeStart,
  rangeEnd,
  filtered = false,
  className,
}: ListResultsMetaProps) {
  if (total === 0) {
    return (
      <p className={className ?? "text-sm text-muted-foreground"}>
        {filtered ? "No results match your filters." : "No results."}
      </p>
    );
  }

  return (
    <p className={className ?? "text-sm text-muted-foreground"}>
      Showing {rangeStart}–{rangeEnd} of {total}
      {filtered ? " (filtered)" : ""}
    </p>
  );
}

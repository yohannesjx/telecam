import { EmptyState } from "@/components/ui/empty-state";

type ListEmptyStateProps = {
  title?: string;
  description?: string;
  filtered?: boolean;
  onClearFilters?: () => void;
};

export function ListEmptyState({
  title,
  description,
  filtered = false,
  onClearFilters,
}: ListEmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      filtered={filtered}
      onClearFilters={onClearFilters}
    />
  );
}

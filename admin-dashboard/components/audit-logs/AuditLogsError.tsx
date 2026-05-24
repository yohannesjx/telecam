import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuditLogsErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function AuditLogsError({ message, onRetry }: AuditLogsErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

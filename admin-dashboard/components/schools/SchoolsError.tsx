"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SchoolsErrorProps = {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
};

export function SchoolsError({
  message = "Could not load schools.",
  onRetry,
  isRetrying = false,
}: SchoolsErrorProps) {
  return (
    <Card className="border-destructive/30 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Schools unavailable
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

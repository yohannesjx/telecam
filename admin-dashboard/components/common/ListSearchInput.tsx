"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ListSearchInputProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showLabel?: boolean;
};

export function ListSearchInput({
  id = "list-search",
  label = "Search",
  value,
  onChange,
  placeholder = "Search…",
  className,
  showLabel = true,
}: ListSearchInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {showLabel ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

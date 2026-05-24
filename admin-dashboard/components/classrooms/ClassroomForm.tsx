"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  classroomFormSchema,
  type ClassroomFormValues,
} from "@/lib/entity-form";

type ClassroomFormProps = {
  defaultValues: ClassroomFormValues;
  onSubmit: (values: ClassroomFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  showStatus?: boolean;
};

export function ClassroomForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  showStatus = true,
}: ClassroomFormProps) {
  const form = useForm<ClassroomFormValues>({
    resolver: zodResolver(classroomFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="classroom-name">Classroom name *</Label>
        <Input id="classroom-name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      {showStatus ? (
        <div className="space-y-2">
          <Label htmlFor="classroom-status">Status *</Label>
          <select id="classroom-status" className={SELECT_CLASS} {...form.register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="classroom-notes">Description / notes</Label>
        <Input
          id="classroom-notes"
          placeholder="Optional section notes"
          {...form.register("notes")}
        />
        <p className="text-xs text-muted-foreground">Stored as age group on the backend.</p>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

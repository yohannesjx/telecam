"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import { childFormSchema, type ChildFormValues } from "@/lib/entity-form";

type ChildFormProps = {
  defaultValues: ChildFormValues;
  classrooms: NormalizedClassroom[];
  onSubmit: (values: ChildFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  showStatus?: boolean;
  focusClassroom?: boolean;
};

export function ChildForm({
  defaultValues,
  classrooms,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  showStatus = true,
  focusClassroom = false,
}: ChildFormProps) {
  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="child-first-name">First name *</Label>
          <Input id="child-first-name" {...form.register("first_name")} />
          {form.formState.errors.first_name ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.first_name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="child-last-name">Last name</Label>
          <Input id="child-last-name" {...form.register("last_name")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="child-classroom">Classroom *</Label>
        <select
          id="child-classroom"
          className={SELECT_CLASS}
          autoFocus={focusClassroom}
          {...form.register("classroom_id")}
        >
          <option value="">Select a classroom</option>
          {classrooms
            .filter((c) => c.status !== "DISABLED")
            .map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
        </select>
        {form.formState.errors.classroom_id ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.classroom_id.message}
          </p>
        ) : null}
      </div>

      {showStatus ? (
        <div className="space-y-2">
          <Label htmlFor="child-status">Status *</Label>
          <select id="child-status" className={SELECT_CLASS} {...form.register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Only basic enrollment fields are collected. No photos or health data in this phase.
      </p>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

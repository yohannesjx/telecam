"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SCHOOL_TIMEZONE,
  schoolFormSchema,
  type SchoolFormValues,
} from "@/lib/school-form";

type SchoolFormProps = {
  defaultValues: SchoolFormValues;
  onSubmit: (values: SchoolFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  showStatus?: boolean;
  disableName?: boolean;
  disableStatus?: boolean;
};

export function SchoolForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  showStatus = true,
  disableName = false,
  disableStatus = false,
}: SchoolFormProps) {
  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="school-name">School name *</Label>
        <Input id="school-name" disabled={disableName} {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      {showStatus ? (
        <div className="space-y-2">
          <Label htmlFor="school-status">Status *</Label>
          <select
            id="school-status"
            className={SELECT_CLASS}
            disabled={disableStatus}
            {...form.register("status")}
          >
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="school-timezone">Timezone *</Label>
        <Input
          id="school-timezone"
          placeholder={DEFAULT_SCHOOL_TIMEZONE}
          {...form.register("timezone")}
        />
        {form.formState.errors.timezone ? (
          <p className="text-xs text-destructive">{form.formState.errors.timezone.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-city">City / Location</Label>
        <Input id="school-city" {...form.register("city")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-address">Address</Label>
        <Input id="school-address" {...form.register("address")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="school-contact-name">Contact name</Label>
          <Input id="school-contact-name" {...form.register("contact_name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="school-contact-phone">Contact phone</Label>
          <Input id="school-contact-phone" {...form.register("contact_phone")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-contact-email">Contact email</Label>
        <Input id="school-contact-email" type="email" {...form.register("contact_email")} />
        {form.formState.errors.contact_email ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.contact_email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="school-notes">Notes</Label>
        <Input id="school-notes" {...form.register("notes")} />
      </div>

      <p className="text-xs text-muted-foreground">
        Extended fields are stored in the school address metadata block on the backend.
      </p>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

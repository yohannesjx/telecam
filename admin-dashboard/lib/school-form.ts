import { z } from "zod";

import { encodeSchoolAddress } from "@/lib/admin/schools-normalizer";
import type { CreateSchoolInput, NormalizedSchoolDetail, UpdateSchoolInput } from "@/lib/admin/schools-types";

export const DEFAULT_SCHOOL_TIMEZONE = "Africa/Addis_Ababa";

export const schoolFormSchema = z.object({
  name: z.string().trim().min(1, "School name is required"),
  status: z.enum(["ACTIVE", "DISABLED"]),
  timezone: z.string().trim().min(1, "Timezone is required"),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  contact_name: z.string().trim().optional(),
  contact_phone: z.string().trim().optional(),
  contact_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email address"),
  notes: z.string().trim().optional(),
});

export type SchoolFormValues = z.infer<typeof schoolFormSchema>;

export const revenueShareFormSchema = z
  .object({
    school_share_percent: z.number().min(0, "Must be at least 0").max(100, "Must be at most 100"),
    platform_share_percent: z.number().min(0, "Must be at least 0").max(100, "Must be at most 100"),
    active_from: z.string().min(1, "Effective from date is required"),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) => Math.round((data.school_share_percent + data.platform_share_percent) * 100) / 100 === 100,
    {
      message: "School and platform shares must total 100%",
      path: ["platform_share_percent"],
    },
  );

export type RevenueShareFormValues = z.infer<typeof revenueShareFormSchema>;

export const assignAdminFormSchema = z.object({
  user_id: z.string().uuid("Enter a valid admin user UUID"),
});

export type AssignAdminFormValues = z.infer<typeof assignAdminFormSchema>;

export function schoolDetailToFormValues(school: NormalizedSchoolDetail): SchoolFormValues {
  return {
    name: school.name,
    status: school.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    timezone: school.timezone ?? DEFAULT_SCHOOL_TIMEZONE,
    city: school.city ?? "",
    address: school.address ?? "",
    contact_name: school.contactName ?? "",
    contact_phone: school.contactPhone ?? "",
    contact_email: school.contactEmail ?? "",
    notes: school.notes ?? "",
  };
}

export function formValuesToCreateInput(values: SchoolFormValues): CreateSchoolInput {
  return {
    name: values.name,
    status: values.status,
    timezone: values.timezone,
    city: values.city,
    address: values.address,
    contact_name: values.contact_name,
    contact_phone: values.contact_phone,
    contact_email: values.contact_email,
    notes: values.notes,
  };
}

export function formValuesToUpdateInput(values: SchoolFormValues): UpdateSchoolInput {
  return formValuesToCreateInput(values);
}

export function buildSchoolApiBody(
  values: SchoolFormValues,
  options: { includeStatus?: boolean } = {},
): Record<string, string> {
  const body: Record<string, string> = {
    name: values.name,
    address: encodeSchoolAddress({
      timezone: values.timezone,
      city: values.city,
      contactName: values.contact_name,
      contactEmail: values.contact_email,
      notes: values.notes,
      streetAddress: values.address,
    }),
    phone: values.contact_phone ?? "",
  };
  if (options.includeStatus) {
    body.status = values.status;
  }
  return body;
}

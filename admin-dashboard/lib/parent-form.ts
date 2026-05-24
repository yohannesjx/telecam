import { z } from "zod";

import type { CreateParentInput } from "@/lib/admin/parents-types";

export const parentFormSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  status: z.enum(["ACTIVE", "BLOCKED", "DISABLED"]),
});

export type ParentFormValues = z.infer<typeof parentFormSchema>;

export const linkChildSchema = z.object({
  parent_id: z.string().uuid("Select a parent"),
  relationship: z.string().trim().optional(),
});

export type LinkChildValues = z.infer<typeof linkChildSchema>;

export function toCreateParentInput(values: ParentFormValues): CreateParentInput {
  return {
    full_name: values.full_name,
    email: values.email,
    phone: values.phone,
    password: values.password,
    status: values.status,
  };
}

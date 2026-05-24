import { z } from "zod";

import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
} from "@/lib/admin/billing-types";
import { extendEndsAtIso, toMinorUnits, toRFC3339FromDateInput } from "@/lib/admin/billing-utils";

export const subscriptionFormSchema = z
  .object({
    parent_id: z.string().uuid("Select a parent"),
    school_id: z.string().uuid("Select a school"),
    status: z.enum(["ACTIVE", "TRIAL", "PAST_DUE", "CANCELLED", "BLOCKED"]),
    starts_at: z.string().min(1, "Start date is required"),
    ends_at: z.string().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (v) => {
      if (!v.ends_at) return true;
      return new Date(v.ends_at) > new Date(v.starts_at);
    },
    { message: "End date must be after start date", path: ["ends_at"] },
  );

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

export const paymentFormSchema = z.object({
  parent_id: z.string().uuid("Select a parent"),
  school_id: z.string().uuid("Select a school"),
  amount: z.string().trim().min(1, "Amount is required"),
  currency: z.string().trim().min(1),
  method: z.enum(["BANK_TRANSFER", "TELEBIRR", "CASH", "MANUAL"]),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  subscription_id: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const invoiceFormSchema = z.object({
  parent_id: z.string().uuid("Select a parent"),
  school_id: z.string().uuid("Select a school"),
  amount: z.string().trim().min(1, "Amount is required"),
  currency: z.string().trim().min(1),
  due_date: z.string().min(1, "Due date is required"),
  description: z.string().trim().min(1, "Description is required"),
  notes: z.string().trim().optional(),
  subscription_id: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const rejectPaymentSchema = z.object({
  notes: z.string().trim().min(1, "Rejection reason is required"),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().trim().min(1, "Void reason is required"),
});

export const changeStatusSchema = z.object({
  status: z.enum(["ACTIVE", "TRIAL", "PAST_DUE", "CANCELLED", "BLOCKED"]),
});

export const extendSubscriptionSchema = z.object({
  days: z.number().int().min(1, "Days must be at least 1"),
});

export function subscriptionFormToInput(values: SubscriptionFormValues): CreateSubscriptionInput {
  return {
    parent_id: values.parent_id,
    school_id: values.school_id,
    status: values.status,
    starts_at: toRFC3339FromDateInput(values.starts_at),
    ends_at: values.ends_at ? toRFC3339FromDateInput(values.ends_at, true) : undefined,
  };
}

export function paymentFormToInput(values: PaymentFormValues): CreatePaymentInput {
  const cents = toMinorUnits(values.amount);
  if (cents <= 0) throw new Error("Amount must be greater than zero");
  return {
    parent_id: values.parent_id,
    school_id: values.school_id,
    amount_cents: cents,
    currency: values.currency || "ETB",
    method: values.method,
    reference: values.reference,
    notes: values.notes,
    subscription_id: values.subscription_id || undefined,
  };
}

export function invoiceFormToInput(values: InvoiceFormValues): CreateInvoiceInput {
  const cents = toMinorUnits(values.amount);
  if (cents <= 0) throw new Error("Amount must be greater than zero");
  return {
    parent_id: values.parent_id,
    school_id: values.school_id,
    amount_cents: cents,
    currency: values.currency || "ETB",
    due_date: values.due_date,
    subscription_id: values.subscription_id || undefined,
  };
}

export function buildExtendEndsAt(
  currentEndsAt: string | null | undefined,
  days: number,
): string {
  return extendEndsAtIso(currentEndsAt, days);
}

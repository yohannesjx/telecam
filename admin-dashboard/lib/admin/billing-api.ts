import { ApiError, apiFetch } from "@/lib/api";
import {
  normalizeInvoiceDetail,
  normalizeInvoices,
  normalizePaymentDetail,
  normalizePayments,
  normalizeSubscriptionDetail,
  normalizeSubscriptions,
} from "@/lib/admin/billing-normalizer";
import type {
  ApprovePaymentInput,
  BillingFilters,
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
  ExtendSubscriptionInput,
  NormalizedInvoice,
  NormalizedPayment,
  NormalizedSubscription,
  RejectPaymentInput,
  UpdateSubscriptionStatusInput,
  VoidInvoiceInput,
} from "@/lib/admin/billing-types";

function buildBillingQuery(params?: BillingFilters): string {
  const query = new URLSearchParams();
  if (params?.schoolId) query.set("school_id", params.schoolId);
  if (params?.parentId) query.set("parent_id", params.parentId);
  if (params?.status && params.status !== "all") query.set("status", params.status.toUpperCase());
  if (params?.method && params.method !== "all") query.set("method", params.method.toUpperCase());
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function getSubscriptions(
  params?: BillingFilters,
): Promise<NormalizedSubscription[]> {
  try {
    const raw = await apiFetch<unknown>(`/admin/subscriptions${buildBillingQuery(params)}`, {
      method: "GET",
    });
    return normalizeSubscriptions(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [];
    throw err;
  }
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<NormalizedSubscription> {
  const raw = await apiFetch<unknown>("/admin/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeSubscriptionDetail(raw);
}

export async function updateSubscriptionStatus(
  id: string,
  input: UpdateSubscriptionStatusInput,
): Promise<NormalizedSubscription> {
  const raw = await apiFetch<unknown>(`/admin/subscriptions/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return normalizeSubscriptionDetail(raw);
}

export async function extendSubscription(
  id: string,
  input: ExtendSubscriptionInput,
): Promise<NormalizedSubscription> {
  const raw = await apiFetch<unknown>(`/admin/subscriptions/${encodeURIComponent(id)}/extend`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return normalizeSubscriptionDetail(raw);
}

export async function getPayments(params?: BillingFilters): Promise<NormalizedPayment[]> {
  try {
    const raw = await apiFetch<unknown>(`/admin/payments${buildBillingQuery(params)}`, {
      method: "GET",
    });
    return normalizePayments(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [];
    throw err;
  }
}

export async function createPayment(input: CreatePaymentInput): Promise<NormalizedPayment> {
  const raw = await apiFetch<unknown>("/admin/payments", {
    method: "POST",
    body: JSON.stringify({
      parent_id: input.parent_id,
      school_id: input.school_id,
      amount_cents: input.amount_cents,
      currency: input.currency ?? "ETB",
      method: input.method,
      reference: input.reference ?? "",
      notes: input.notes ?? "",
      subscription_id: input.subscription_id ?? "",
    }),
  });
  return normalizePaymentDetail(raw);
}

export async function approvePayment(
  id: string,
  input?: ApprovePaymentInput,
): Promise<NormalizedPayment> {
  const raw = await apiFetch<unknown>(`/admin/payments/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
    body: JSON.stringify(input ?? {}),
  });
  return normalizePaymentDetail(raw);
}

export async function rejectPayment(
  id: string,
  input: RejectPaymentInput,
): Promise<NormalizedPayment> {
  const raw = await apiFetch<unknown>(`/admin/payments/${encodeURIComponent(id)}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ notes: input.notes }),
  });
  return normalizePaymentDetail(raw);
}

export async function getInvoices(params?: BillingFilters): Promise<NormalizedInvoice[]> {
  try {
    const raw = await apiFetch<unknown>(`/admin/invoices${buildBillingQuery(params)}`, {
      method: "GET",
    });
    return normalizeInvoices(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [];
    throw err;
  }
}

export async function createInvoice(input: CreateInvoiceInput): Promise<NormalizedInvoice> {
  const raw = await apiFetch<unknown>("/admin/invoices", {
    method: "POST",
    body: JSON.stringify({
      parent_id: input.parent_id,
      school_id: input.school_id,
      amount_cents: input.amount_cents,
      currency: input.currency ?? "ETB",
      due_date: input.due_date,
      subscription_id: input.subscription_id ?? "",
    }),
  });
  return normalizeInvoiceDetail(raw);
}

export async function markInvoicePaid(id: string): Promise<NormalizedInvoice> {
  const raw = await apiFetch<unknown>(`/admin/invoices/${encodeURIComponent(id)}/mark-paid`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
  return normalizeInvoiceDetail(raw);
}

export async function voidInvoice(id: string, _input?: VoidInvoiceInput): Promise<NormalizedInvoice> {
  const raw = await apiFetch<unknown>(`/admin/invoices/${encodeURIComponent(id)}/void`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
  return normalizeInvoiceDetail(raw);
}

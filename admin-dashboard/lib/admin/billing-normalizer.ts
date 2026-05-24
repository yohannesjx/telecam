import { computeDaysRemaining } from "@/lib/admin/billing-utils";
import type {
  BillingFilters,
  InvoiceStatus,
  NormalizedInvoice,
  NormalizedPayment,
  NormalizedSubscription,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
} from "@/lib/admin/billing-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function bool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  const s = String(value ?? "").toUpperCase();
  if (
    s === "ACTIVE" ||
    s === "TRIAL" ||
    s === "EXPIRED" ||
    s === "CANCELLED" ||
    s === "PAST_DUE" ||
    s === "BLOCKED" ||
    s === "DISABLED"
  ) {
    return s;
  }
  return "UNKNOWN";
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const s = String(value ?? "").toUpperCase();
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED" || s === "REFUNDED") return s;
  return "UNKNOWN";
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const s = String(value ?? "").toUpperCase();
  if (s === "OPEN" || s === "PAID" || s === "VOID" || s === "VOIDED" || s === "OVERDUE") return s;
  return "UNKNOWN";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const s = String(value ?? "").toUpperCase();
  if (s === "BANK_TRANSFER" || s === "TELEBIRR" || s === "CASH" || s === "MANUAL") return s;
  return "UNKNOWN";
}

function unwrapList(raw: unknown, keys: string[]): unknown[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload)) {
    const nested = pick(payload, keys);
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

export function normalizeSubscription(raw: unknown): NormalizedSubscription {
  const row = isRecord(raw) ? raw : {};
  const endsAt = str(pick(row, ["ends_at", "endsAt"])) ?? null;
  const playback =
    bool(pick(row, ["allowed_playback", "allowedPlayback", "playback_allowed", "playbackAllowed"])) ??
    null;
  return {
    id: str(pick(row, ["id"])) ?? "",
    parentId: str(pick(row, ["parent_id", "parentId"])) ?? null,
    parentName: str(pick(row, ["parent_name", "parentName"])) ?? null,
    parentEmail: str(pick(row, ["parent_email", "parentEmail"])) ?? null,
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    childId: str(pick(row, ["child_id", "childId"])) ?? null,
    childName: str(pick(row, ["child_name", "childName"])) ?? null,
    status: normalizeSubscriptionStatus(pick(row, ["status"])),
    plan: str(pick(row, ["plan", "plan_type", "planType"])) ?? null,
    startsAt: str(pick(row, ["starts_at", "startsAt"])) ?? null,
    endsAt,
    daysRemaining: computeDaysRemaining(endsAt),
    playbackAllowed: playback,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeSubscriptions(raw: unknown): NormalizedSubscription[] {
  return unwrapList(raw, ["subscriptions", "data", "items"])
    .filter(isRecord)
    .map((row) => normalizeSubscription(row));
}

export function normalizePayment(raw: unknown): NormalizedPayment {
  const row = isRecord(raw) ? raw : {};
  return {
    id: str(pick(row, ["id"])) ?? "",
    parentId: str(pick(row, ["parent_id", "parentId"])) ?? null,
    parentName: str(pick(row, ["parent_name", "parentName"])) ?? null,
    parentEmail: str(pick(row, ["parent_email", "parentEmail"])) ?? null,
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    subscriptionId: str(pick(row, ["subscription_id", "subscriptionId"])) ?? null,
    invoiceId: str(pick(row, ["invoice_id", "invoiceId"])) ?? null,
    amountCents: num(pick(row, ["amount_cents", "amountCents", "amount_minor", "amount"])),
    currency: str(pick(row, ["currency"])) ?? "ETB",
    method: normalizePaymentMethod(pick(row, ["method", "payment_method", "paymentMethod"])),
    status: normalizePaymentStatus(pick(row, ["status"])),
    reference: str(pick(row, ["reference"])) ?? null,
    notes: str(pick(row, ["notes"])) ?? null,
    paidAt: str(pick(row, ["paid_at", "paidAt"])) ?? null,
    approvedAt: str(pick(row, ["approved_at", "approvedAt"])) ?? null,
    rejectedAt: str(pick(row, ["rejected_at", "rejectedAt"])) ?? null,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizePayments(raw: unknown): NormalizedPayment[] {
  return unwrapList(raw, ["payments", "data", "items"])
    .filter(isRecord)
    .map((row) => normalizePayment(row));
}

export function normalizeInvoice(raw: unknown): NormalizedInvoice {
  const row = isRecord(raw) ? raw : {};
  const status = normalizeInvoiceStatus(pick(row, ["status"]));
  return {
    id: str(pick(row, ["id"])) ?? "",
    invoiceNumber: str(pick(row, ["invoice_number", "invoiceNumber"])) ?? null,
    parentId: str(pick(row, ["parent_id", "parentId"])) ?? null,
    parentName: str(pick(row, ["parent_name", "parentName"])) ?? null,
    parentEmail: str(pick(row, ["parent_email", "parentEmail"])) ?? null,
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    subscriptionId: str(pick(row, ["subscription_id", "subscriptionId"])) ?? null,
    amountCents: num(pick(row, ["amount_cents", "amountCents", "amount_minor", "amount"])),
    currency: str(pick(row, ["currency"])) ?? "ETB",
    status,
    description: str(pick(row, ["description", "notes"])) ?? null,
    dueDate: str(pick(row, ["due_date", "dueDate"])) ?? null,
    paidAt: str(pick(row, ["paid_at", "paidAt"])) ?? null,
    voidedAt: status === "VOID" || status === "VOIDED" ? str(pick(row, ["updated_at", "updatedAt"])) ?? null : null,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeInvoices(raw: unknown): NormalizedInvoice[] {
  return unwrapList(raw, ["invoices", "data", "items"])
    .filter(isRecord)
    .map((row) => normalizeInvoice(row));
}

function unwrapDetail(raw: unknown, key: string): unknown {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  if (isRecord(payload) && key in payload) return payload[key];
  return payload;
}

export function normalizeSubscriptionDetail(raw: unknown): NormalizedSubscription {
  return normalizeSubscription(unwrapDetail(raw, "subscription"));
}

export function normalizePaymentDetail(raw: unknown): NormalizedPayment {
  return normalizePayment(unwrapDetail(raw, "payment"));
}

export function normalizeInvoiceDetail(raw: unknown): NormalizedInvoice {
  return normalizeInvoice(unwrapDetail(raw, "invoice"));
}

export function filterBillingItems<
  T extends {
    parentName?: string | null;
    parentEmail?: string | null;
    schoolName?: string | null;
    reference?: string | null;
    invoiceNumber?: string | null;
    status?: string;
  },
>(items: T[], filters: BillingFilters): T[] {
  const q = (filters.search ?? "").trim().toLowerCase();
  return items.filter((item) => {
    if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
    if (!q) return true;
    const haystack = [
      item.parentName,
      item.parentEmail,
      item.schoolName,
      item.reference,
      item.invoiceNumber,
      item.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIAL"
  | "EXPIRED"
  | "CANCELLED"
  | "PAST_DUE"
  | "BLOCKED"
  | "DISABLED"
  | "UNKNOWN";

export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "UNKNOWN";

export type InvoiceStatus = "OPEN" | "PAID" | "VOID" | "VOIDED" | "OVERDUE" | "UNKNOWN";

export type PaymentMethod = "BANK_TRANSFER" | "TELEBIRR" | "CASH" | "MANUAL" | "UNKNOWN";

export type BillingFilters = {
  schoolId?: string;
  parentId?: string;
  status?: string;
  method?: string;
  search?: string;
};

export type NormalizedSubscription = {
  id: string;
  parentId?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  schoolId?: string | null;
  schoolName?: string | null;
  childId?: string | null;
  childName?: string | null;
  status: SubscriptionStatus;
  plan?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  daysRemaining?: number | null;
  playbackAllowed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NormalizedPayment = {
  id: string;
  parentId?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  schoolId?: string | null;
  schoolName?: string | null;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NormalizedInvoice = {
  id: string;
  invoiceNumber?: string | null;
  parentId?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  schoolId?: string | null;
  schoolName?: string | null;
  subscriptionId?: string | null;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  description?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateSubscriptionInput = {
  parent_id: string;
  school_id: string;
  status: string;
  starts_at?: string;
  ends_at?: string;
};

export type UpdateSubscriptionStatusInput = {
  status: string;
};

export type ExtendSubscriptionInput = {
  ends_at: string;
};

export type CreatePaymentInput = {
  parent_id: string;
  school_id: string;
  amount_cents: number;
  currency?: string;
  method: string;
  reference?: string;
  notes?: string;
  subscription_id?: string;
};

export type ApprovePaymentInput = {
  notes?: string;
};

export type RejectPaymentInput = {
  notes: string;
};

export type CreateInvoiceInput = {
  parent_id: string;
  school_id: string;
  amount_cents: number;
  currency?: string;
  due_date: string;
  subscription_id?: string;
};

export type VoidInvoiceInput = {
  reason?: string;
};

export type MarkInvoicePaidInput = Record<string, never>;

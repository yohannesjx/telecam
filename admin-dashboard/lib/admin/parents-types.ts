export type ParentStatus = "ACTIVE" | "BLOCKED" | "DISABLED" | "UNKNOWN";

export type NormalizedParent = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: ParentStatus;
  linkedChildrenCount?: number | null;
  schoolNames?: string[];
  subscriptionStatus?: string | null;
  playbackAllowed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NormalizedLinkedChild = {
  id: string;
  name: string;
  schoolId?: string | null;
  schoolName?: string | null;
  classroomId?: string | null;
  classroomName?: string | null;
  status?: string | null;
  relationship?: string | null;
  linkedAt?: string | null;
};

export type NormalizedParentDetail = NormalizedParent & {
  linkedChildren?: NormalizedLinkedChild[];
  subscription?: {
    status?: string | null;
    plan?: string | null;
    startedAt?: string | null;
    endsAt?: string | null;
    daysRemaining?: number | null;
    playbackAllowed?: boolean | null;
  } | null;
  payments?: Array<{
    id?: string;
    amountCents?: number | null;
    currency?: string | null;
    method?: string | null;
    status?: string | null;
    createdAt?: string | null;
    approvedAt?: string | null;
  }>;
  invoices?: Array<{
    id?: string;
    invoiceNumber?: string | null;
    amountCents?: number | null;
    currency?: string | null;
    status?: string | null;
    dueDate?: string | null;
    paidAt?: string | null;
  }>;
};

export type CreateParentInput = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  status?: "ACTIVE" | "BLOCKED" | "DISABLED";
};

export type LinkParentToChildInput = {
  parent_id: string;
  relationship?: string;
};

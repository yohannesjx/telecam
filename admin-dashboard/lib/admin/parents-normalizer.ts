import type {
  NormalizedLinkedChild,
  NormalizedParent,
  NormalizedParentDetail,
  ParentStatus,
} from "@/lib/admin/parents-types";

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

function normalizeStatus(value: unknown): ParentStatus {
  const s = String(value ?? "").toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "BLOCKED") return "BLOCKED";
  if (s === "DISABLED") return "DISABLED";
  return "UNKNOWN";
}

export function normalizeParent(raw: unknown): NormalizedParent {
  const row = isRecord(raw) ? raw : {};
  const firstName = str(pick(row, ["first_name", "firstName"])) ?? "";
  const lastName = str(pick(row, ["last_name", "lastName"])) ?? "";
  const fullName =
    str(pick(row, ["full_name", "fullName", "name"])) ??
    `${firstName} ${lastName}`.trim() ??
    "Unknown parent";

  return {
    id: str(pick(row, ["id", "user_id", "userId", "parent_id", "parentId"])) ?? "",
    name: fullName,
    email: str(pick(row, ["email"])) ?? "",
    phone: str(pick(row, ["phone"])) ?? null,
    status: normalizeStatus(pick(row, ["status"])),
    linkedChildrenCount: null,
    schoolNames: [],
    subscriptionStatus: null,
    playbackAllowed: null,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeParents(raw: unknown): NormalizedParent[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["parents", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map((row) => normalizeParent(row));
}

export function normalizeLinkedChild(raw: unknown): NormalizedLinkedChild {
  const row = isRecord(raw) ? raw : {};
  return {
    id: str(pick(row, ["id", "child_id", "childId"])) ?? "",
    name: str(pick(row, ["full_name", "fullName", "name"])) ?? "Unknown child",
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    schoolName: str(pick(row, ["school_name", "schoolName"])) ?? null,
    classroomId: str(pick(row, ["classroom_id", "classroomId"])) ?? null,
    classroomName: str(pick(row, ["classroom_name", "classroomName"])) ?? null,
    status: str(pick(row, ["status"])) ?? null,
    relationship: str(pick(row, ["relationship"])) ?? null,
    linkedAt: str(pick(row, ["linked_at", "linkedAt", "created_at"])) ?? null,
  };
}

export function normalizeParentDetail(
  parent: NormalizedParent,
  linkedChildren: NormalizedLinkedChild[],
): NormalizedParentDetail {
  return {
    ...parent,
    linkedChildren,
    subscription: null,
    payments: [],
    invoices: [],
  };
}

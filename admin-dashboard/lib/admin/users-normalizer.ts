import type {
  ManagedUserRole,
  ManagedUserStatus,
  NormalizedUser,
} from "@/lib/admin/users-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function bool(value: unknown): boolean {
  return value === true;
}

function normalizeRole(value: unknown): ManagedUserRole {
  const role = str(value)?.toUpperCase();
  if (role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "TECHNICIAN") {
    return role;
  }
  return "TECHNICIAN";
}

function normalizeStatus(value: unknown): ManagedUserStatus {
  const status = str(value)?.toUpperCase();
  if (status === "ACTIVE" || status === "BLOCKED" || status === "DISABLED") {
    return status;
  }
  return "ACTIVE";
}

function normalizeSchoolIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function normalizeUser(raw: unknown): NormalizedUser | null {
  if (!isRecord(raw)) return null;

  const id = str(raw.id);
  if (!id) return null;

  return {
    id,
    name: str(raw.full_name) ?? str(raw.name) ?? "Unknown",
    email: str(raw.email) ?? null,
    phone: str(raw.phone) ?? null,
    role: normalizeRole(raw.role),
    status: normalizeStatus(raw.status),
    forcePasswordChange: bool(raw.force_password_change),
    passwordChangedAt: str(raw.password_changed_at) ?? null,
    lastLoginAt: str(raw.last_login_at) ?? null,
    createdAt: str(raw.created_at) ?? null,
    updatedAt: str(raw.updated_at) ?? null,
    schoolIds: normalizeSchoolIds(raw.school_ids),
  };
}

export function normalizeUsers(raw: unknown): NormalizedUser[] {
  if (Array.isArray(raw)) {
    return raw.map(normalizeUser).filter((u): u is NormalizedUser => u !== null);
  }
  if (isRecord(raw) && Array.isArray(raw.items)) {
    return normalizeUsers(raw.items);
  }
  return [];
}

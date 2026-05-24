import type { AuthUser, UserRole, UserStatus } from "@/lib/auth/types";

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let logoutHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function registerRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  refreshHandler = handler;
}

export function registerLogoutHandler(handler: (() => void) | null): void {
  logoutHandler = handler;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshHandler) return null;
  return refreshHandler();
}

export function triggerSessionExpired(): void {
  logoutHandler?.();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

const VALID_ROLES: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TECHNICIAN", "PARENT"];
const VALID_STATUSES: UserStatus[] = ["ACTIVE", "BLOCKED", "DISABLED"];

function pickId(obj: Record<string, unknown>): string | undefined {
  const direct = pickString(obj, ["id", "user_id", "userId"]);
  if (direct) return direct;
  const nested = obj.user;
  if (isRecord(nested)) return pickString(nested, ["id", "user_id", "userId"]);
  return undefined;
}

function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_");
  if (upper === "SUPERADMIN") return "SUPER_ADMIN";
  if (upper === "SCHOOLADMIN") return "SCHOOL_ADMIN";
  if (VALID_ROLES.includes(upper as UserRole)) return upper as UserRole;
  return null;
}

function normalizeUserStatus(value: unknown): UserStatus {
  if (typeof value !== "string") return "ACTIVE";
  const upper = value.trim().toUpperCase();
  if (VALID_STATUSES.includes(upper as UserStatus)) return upper as UserStatus;
  return "ACTIVE";
}

export function normalizeUser(raw: unknown): AuthUser | null {
  if (!isRecord(raw)) return null;

  const id = pickId(raw);
  const email = pickString(raw, ["email"]) ?? (isRecord(raw.user) ? pickString(raw.user, ["email"]) : undefined);
  const role =
    normalizeUserRole(raw.role) ??
    normalizeUserRole(raw.user_role) ??
    normalizeUserRole(raw.userRole) ??
    (isRecord(raw.user) ? normalizeUserRole(raw.user.role) : null);

  if (!id || !email || !role) {
    return null;
  }

  return {
    id,
    email: email.trim(),
    role,
    status: normalizeUserStatus(raw.status ?? (isRecord(raw.user) ? raw.user.status : undefined)),
    name: pickString(raw, ["name", "full_name", "fullName"]) ?? null,
    force_password_change:
      raw.force_password_change === true || raw.forcePasswordChange === true,
  };
}

export function unwrapPayload(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) {
    return raw.data;
  }
  return raw;
}

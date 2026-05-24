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

export function normalizeUser(raw: unknown): AuthUser | null {
  if (!isRecord(raw)) return null;

  const id = pickString(raw, ["id"]);
  const email = pickString(raw, ["email"]);
  const role = pickString(raw, ["role"]) as UserRole | undefined;
  const status = pickString(raw, ["status"]) as UserStatus | undefined;

  if (!id || !email || !role || !VALID_ROLES.includes(role)) {
    return null;
  }

  const normalizedStatus = status && VALID_STATUSES.includes(status) ? status : "ACTIVE";

  return {
    id,
    email,
    role,
    status: normalizedStatus,
    name: pickString(raw, ["name", "full_name", "fullName"]) ?? null,
  };
}

export function unwrapPayload(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) {
    return raw.data;
  }
  return raw;
}

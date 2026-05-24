import { apiFetch, ApiError } from "@/lib/api";
import { APP_NAME } from "@/lib/config";
import { getOrCreateDeviceFingerprint } from "@/lib/auth/storage";
import {
  normalizeUser,
  unwrapPayload,
} from "@/lib/auth/session-store";
import type {
  AuthUser,
  LoginResponse,
  MeResponse,
  RefreshResponse,
} from "@/lib/auth/types";
import { normalizeDashboardRole } from "@/lib/auth/permissions";
import {
  ALLOWED_DASHBOARD_ROLES,
  DASHBOARD_ACCESS_DENIED_MESSAGE,
} from "@/lib/auth/types";

const DEVICE_NAME = APP_NAME;

function parseLoginResponse(raw: unknown): LoginResponse {
  const body = unwrapPayload(raw);
  if (typeof body !== "object" || body === null) {
    throw new ApiError("Unexpected login response", 500, raw);
  }
  const record = body as Record<string, unknown>;
  const accessToken =
    typeof record.access_token === "string"
      ? record.access_token
      : typeof record.accessToken === "string"
        ? record.accessToken
        : "";
  const refreshToken =
    typeof record.refresh_token === "string"
      ? record.refresh_token
      : typeof record.refreshToken === "string"
        ? record.refreshToken
        : "";
  const user = normalizeUser(record.user);
  if (!accessToken || !refreshToken || !user) {
    throw new ApiError("Unexpected login response", 500, raw);
  }
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user,
    expires_in:
      typeof record.expires_in === "number"
        ? record.expires_in
        : typeof record.expiresIn === "number"
          ? record.expiresIn
          : undefined,
  };
}

function parseRefreshResponse(raw: unknown): RefreshResponse {
  const body = unwrapPayload(raw);
  if (typeof body !== "object" || body === null) {
    throw new ApiError("Unexpected refresh response", 500, raw);
  }
  const record = body as Record<string, unknown>;
  const accessToken =
    typeof record.access_token === "string"
      ? record.access_token
      : typeof record.accessToken === "string"
        ? record.accessToken
        : "";
  if (!accessToken) {
    throw new ApiError("Unexpected refresh response", 500, raw);
  }
  const refreshToken =
    typeof record.refresh_token === "string"
      ? record.refresh_token
      : typeof record.refreshToken === "string"
        ? record.refreshToken
        : undefined;
  const user = record.user ? normalizeUser(record.user) : undefined;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: user ?? undefined,
    expires_in:
      typeof record.expires_in === "number"
        ? record.expires_in
        : typeof record.expiresIn === "number"
          ? record.expiresIn
          : undefined,
  };
}

function parseMeResponse(raw: unknown): AuthUser {
  const body = unwrapPayload(raw);
  if (typeof body !== "object" || body === null) {
    throw new ApiError("Unexpected profile response", 500, raw);
  }
  const record = body as Record<string, unknown>;
  const user = normalizeUser(record.user ?? record);
  if (!user) {
    throw new ApiError("Unexpected profile response", 500, raw);
  }
  return user;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const raw = await apiFetch<unknown>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      device_name: DEVICE_NAME,
      device_fingerprint: getOrCreateDeviceFingerprint(),
    }),
    skipAuth: true,
  });
  return parseLoginResponse(raw);
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const raw = await apiFetch<unknown>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipAuth: true,
  });
  return parseRefreshResponse(raw);
}

export async function logout(
  refreshToken: string,
  accessToken?: string,
): Promise<void> {
  await apiFetch<unknown>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    token: accessToken,
    skipAuth: true,
  });
}

export async function getMe(accessToken: string): Promise<AuthUser> {
  const raw = await apiFetch<MeResponse | unknown>("/auth/me", {
    method: "GET",
    token: accessToken,
    skipAuth: true,
  });
  return parseMeResponse(raw);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthUser> {
  const raw = await apiFetch<unknown>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  return parseMeResponse(raw);
}

export function assertDashboardAccess(user: AuthUser): void {
  if (user.status !== "ACTIVE") {
    throw new ApiError(DASHBOARD_ACCESS_DENIED_MESSAGE, 403);
  }
  const role = normalizeDashboardRole(user.role);
  if (!role || !ALLOWED_DASHBOARD_ROLES.includes(role)) {
    throw new ApiError(DASHBOARD_ACCESS_DENIED_MESSAGE, 403);
  }
}

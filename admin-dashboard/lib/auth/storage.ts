import type { AuthUser } from "@/lib/auth/types";
import { normalizeUser } from "@/lib/auth/session-store";

const REFRESH_TOKEN_KEY = "sc_refresh_token";
const USER_KEY = "sc_user";
const DEVICE_FINGERPRINT_KEY = "sc_device_fingerprint";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStoredRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (!canUseStorage()) return;
  if (!token) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getStoredUser(): AuthUser | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return normalizeUser(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (!canUseStorage()) return;
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getOrCreateDeviceFingerprint(): string {
  if (!canUseStorage()) return "web-dashboard-ssr";
  const existing = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (existing) return existing;
  const fingerprint =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `web-dashboard-${crypto.randomUUID()}`
      : `web-dashboard-${Date.now()}`;
  localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
  return fingerprint;
}

export function clearAuthStorage(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

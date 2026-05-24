import { ApiError, apiFetch } from "@/lib/api";
import { normalizeUser, normalizeUsers } from "@/lib/admin/users-normalizer";
import type {
  CreateUserInput,
  NormalizedUser,
  ResetPasswordInput,
  ResetPasswordResult,
  UpdateUserInput,
  UserListFilters,
} from "@/lib/admin/users-types";

function unwrapData(raw: unknown): unknown {
  if (typeof raw === "object" && raw !== null && "data" in raw) {
    return (raw as { data: unknown }).data;
  }
  return raw;
}

function buildQuery(filters?: UserListFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.school_id) params.set("school_id", filters.school_id);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function getUsers(filters?: UserListFilters): Promise<NormalizedUser[]> {
  try {
    const raw = await apiFetch<unknown>(`/admin/users${buildQuery(filters)}`, { method: "GET" });
    return normalizeUsers(unwrapData(raw));
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [];
    throw err;
  }
}

export async function getUserById(userId: string): Promise<NormalizedUser | null> {
  const raw = await apiFetch<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
  return normalizeUser(unwrapData(raw));
}

export async function createUser(input: CreateUserInput): Promise<NormalizedUser> {
  const raw = await apiFetch<unknown>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const user = normalizeUser(unwrapData(raw));
  if (!user) throw new ApiError("Unexpected create user response", 500, raw);
  return user;
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<NormalizedUser> {
  const raw = await apiFetch<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const user = normalizeUser(unwrapData(raw));
  if (!user) throw new ApiError("Unexpected update user response", 500, raw);
  return user;
}

export async function updateUserStatus(
  userId: string,
  status: string,
): Promise<NormalizedUser> {
  const raw = await apiFetch<unknown>(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const user = normalizeUser(unwrapData(raw));
  if (!user) throw new ApiError("Unexpected status update response", 500, raw);
  return user;
}

export async function updateUserRole(userId: string, role: string): Promise<NormalizedUser> {
  const raw = await apiFetch<unknown>(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  const user = normalizeUser(unwrapData(raw));
  if (!user) throw new ApiError("Unexpected role update response", 500, raw);
  return user;
}

export async function resetUserPassword(
  userId: string,
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  const raw = await apiFetch<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  const data = unwrapData(raw);
  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    const temp =
      typeof record.temporary_password === "string" ? record.temporary_password : null;
    return { temporaryPassword: temp };
  }
  return { temporaryPassword: null };
}

export async function forceUserPasswordChange(
  userId: string,
  force: boolean,
): Promise<NormalizedUser> {
  const raw = await apiFetch<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/force-password-change`,
    {
      method: "POST",
      body: JSON.stringify({ force }),
    },
  );
  const user = normalizeUser(unwrapData(raw));
  if (!user) throw new ApiError("Unexpected force password change response", 500, raw);
  return user;
}

export async function assignUserSchools(
  userId: string,
  schoolIds: string[],
): Promise<NormalizedUser> {
  const raw = await apiFetch<unknown>(`/admin/users/${encodeURIComponent(userId)}/schools`, {
    method: "PUT",
    body: JSON.stringify({ school_ids: schoolIds }),
  });
  const user = normalizeUser(unwrapData(raw));
  if (!user) throw new ApiError("Unexpected school assignment response", 500, raw);
  return user;
}

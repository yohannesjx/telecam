import { ApiError, apiFetch } from "@/lib/api";
import type {
  ParentInvitationCode,
  ParentInvitationCodeGenerated,
  ParentInvitationCodeStatus,
} from "@/lib/admin/parent-codes-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function normalizeStatus(value: unknown): ParentInvitationCodeStatus {
  const s = String(value ?? "").toLowerCase();
  if (s === "active") return "active";
  if (s === "used") return "used";
  if (s === "revoked") return "revoked";
  if (s === "expired") return "expired";
  return "unknown";
}

/**
 * Normalize a single invitation code record. Strips `code_hash` if it ever
 * appears (defensive — backend must not return it).
 */
function normalizeCode(raw: unknown): ParentInvitationCode {
  const row = isRecord(raw) ? raw : {};
  return {
    id: str(pick(row, ["id", "code_id", "codeId"])) ?? "",
    codePrefix: str(pick(row, ["code_prefix", "codePrefix"])) ?? "",
    status: normalizeStatus(pick(row, ["status"])),
    expiresAt: str(pick(row, ["expires_at", "expiresAt"])) ?? null,
    usedAt: str(pick(row, ["used_at", "usedAt"])) ?? null,
    revokedAt: str(pick(row, ["revoked_at", "revokedAt"])) ?? null,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
  };
}

function normalizeCodeList(raw: unknown): ParentInvitationCode[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["codes", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map(normalizeCode);
}

function normalizeGeneratedCode(raw: unknown): ParentInvitationCodeGenerated {
  const payload = isRecord(raw) && "data" in raw ? (raw.data as unknown) : raw;
  const row = isRecord(payload) ? payload : {};
  const base = normalizeCode(row);
  // Backend returns the raw 6-digit code under "parent_code". Treat any
  // missing value as an error — without it the modal would be useless.
  const rawCode = str(pick(row, ["parent_code", "parentCode", "code"]));
  return {
    ...base,
    id: base.id || str(pick(row, ["code_id", "codeId"])) || "",
    rawCode: rawCode ?? "",
  };
}

/**
 * Generate or regenerate the parent's invitation code. The backend revokes any
 * existing active code for this parent+school before issuing the new one.
 */
export async function generateParentInvitationCode(
  parentId: string,
  schoolId: string,
): Promise<ParentInvitationCodeGenerated> {
  const raw = await apiFetch<unknown>(
    `/admin/parents/${encodeURIComponent(parentId)}/invitation-code`,
    {
      method: "POST",
      body: JSON.stringify({ school_id: schoolId }),
    },
  );
  return normalizeGeneratedCode(raw);
}

/**
 * List the parent's invitation code history (masked prefix + status only).
 * Never returns the raw code or hash.
 */
export async function listParentInvitationCodes(
  parentId: string,
): Promise<ParentInvitationCode[]> {
  try {
    const raw = await apiFetch<unknown>(
      `/admin/parents/${encodeURIComponent(parentId)}/invitation-codes`,
      { method: "GET" },
    );
    return normalizeCodeList(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [];
    throw err;
  }
}

/**
 * Revoke a specific invitation code. Idempotent on the backend.
 */
export async function revokeParentInvitationCode(
  parentId: string,
  codeId: string,
): Promise<void> {
  await apiFetch<unknown>(
    `/admin/parents/${encodeURIComponent(parentId)}/invitation-codes/${encodeURIComponent(codeId)}/revoke`,
    { method: "POST" },
  );
}

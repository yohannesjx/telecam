/**
 * Parent invitation code DTOs returned by /admin/parents/:parent_id/invitation-code(s).
 *
 * Security:
 * - `rawCode` is ONLY present on the response from generate/regenerate, never on
 *   the list endpoint. It must never be persisted in localStorage/sessionStorage
 *   or logged.
 * - `codeHash` is never exposed by the backend; this type intentionally omits it.
 * - `codePrefix` is the masked form ("49****") — safe to display.
 */
export type ParentInvitationCodeStatus =
  | "active"
  | "used"
  | "revoked"
  | "expired"
  | "unknown";

export type ParentInvitationCode = {
  id: string;
  codePrefix: string;
  status: ParentInvitationCodeStatus;
  expiresAt?: string | null;
  usedAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string | null;
};

/**
 * Returned ONLY by generate/regenerate. Contains the raw 6-digit code which the
 * caller must show once and immediately discard.
 */
export type ParentInvitationCodeGenerated = ParentInvitationCode & {
  rawCode: string;
};

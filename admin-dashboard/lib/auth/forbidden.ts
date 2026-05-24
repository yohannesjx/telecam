import { ApiError } from "@/lib/api";

export const PAGE_ACCESS_DENIED_MESSAGE =
  "You do not have permission to access this page.";

export const ACTION_FORBIDDEN_MESSAGE =
  "You do not have permission to perform this action.";

/** @deprecated Use ACTION_FORBIDDEN_MESSAGE */
export const FORBIDDEN_MESSAGE = ACTION_FORBIDDEN_MESSAGE;

export function isForbiddenError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

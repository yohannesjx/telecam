/**
 * Public runtime config (safe for browser).
 * Override via .env.local — never commit secrets here in later phases.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://camera.iglooks.com/api";

export const APP_NAME = "School Camera Admin";

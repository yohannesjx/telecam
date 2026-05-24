export type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TECHNICIAN" | "PARENT";

export type UserStatus = "ACTIVE" | "BLOCKED" | "DISABLED";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name?: string | null;
  force_password_change?: boolean;
};

export type LoginRequest = {
  email: string;
  password: string;
  device_name?: string;
  device_fingerprint?: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  expires_in?: number;
};

export type RefreshResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};

export const ALLOWED_DASHBOARD_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TECHNICIAN",
];

export const DASHBOARD_ACCESS_DENIED_MESSAGE =
  "This account is not allowed to access the admin dashboard.";

export const GENERIC_LOGIN_ERROR = "Invalid email or password.";

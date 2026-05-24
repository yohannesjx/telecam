export type ManagedUserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TECHNICIAN";

export type ManagedUserStatus = "ACTIVE" | "BLOCKED" | "DISABLED";

export type NormalizedUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  forcePasswordChange: boolean;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  schoolIds: string[];
};

export type CreateUserInput = {
  name: string;
  email: string;
  phone?: string;
  role: ManagedUserRole;
  status?: ManagedUserStatus;
  temporary_password: string;
  force_password_change?: boolean;
  school_ids?: string[];
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  phone?: string;
};

export type ResetPasswordInput = {
  temporary_password?: string;
  generate?: boolean;
  force_change?: boolean;
};

export type ResetPasswordResult = {
  temporaryPassword: string | null;
};

export type UserListFilters = {
  search?: string;
  role?: ManagedUserRole | "";
  status?: ManagedUserStatus | "";
  school_id?: string;
};

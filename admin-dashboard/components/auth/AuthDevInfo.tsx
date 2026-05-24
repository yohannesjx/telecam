"use client";

import { useAuth } from "@/lib/auth/auth-context";
import {
  getPermissionsForRole,
  hasPermission,
  normalizeDashboardRole,
} from "@/lib/auth/permissions";

const USER_MANAGEMENT_PERMISSIONS = [
  "users:view",
  "users:create",
  "users:update",
  "users:resetPassword",
  "users:changeRole",
  "users:disable",
] as const;

export function AuthDevInfo() {
  if (process.env.NODE_ENV !== "development") return null;

  const { user } = useAuth();
  if (!user) return null;

  const normalizedRole = normalizeDashboardRole(user.role);
  const permissions = getPermissionsForRole(user.role);
  const usersNavVisible = hasPermission(user.role, "users:view");

  return (
    <div className="border-t border-dashed border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[10px] leading-relaxed text-amber-950">
      <p className="font-semibold uppercase tracking-wide text-amber-800">Dev auth debug</p>
      <p className="mt-1 truncate">
        <span className="text-amber-700">email:</span> {user.email}
      </p>
      <p>
        <span className="text-amber-700">role (raw):</span> {JSON.stringify(user.role)}
      </p>
      <p>
        <span className="text-amber-700">role (normalized):</span>{" "}
        {normalizedRole ?? "— invalid —"}
      </p>
      <p>
        <span className="text-amber-700">Users nav:</span> {usersNavVisible ? "visible" : "hidden"}
      </p>
      <p className="mt-1">
        <span className="text-amber-700">users:*</span>{" "}
        {USER_MANAGEMENT_PERMISSIONS.map((p) => (
          <span key={p} className={permissions.includes(p) ? "text-emerald-700" : "text-red-700"}>
            {permissions.includes(p) ? "✓" : "✗"}
            {p.replace("users:", "")}{" "}
          </span>
        ))}
      </p>
      <p className="mt-1 text-amber-700">
        permissions ({permissions.length}): {permissions.join(", ") || "none"}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Lock, RefreshCw } from "lucide-react";

import { ClassroomsSkeleton } from "@/components/classrooms/ClassroomsSkeleton";
import { SchoolsError } from "@/components/schools/SchoolsError";
import { ForcePasswordChangeDialog } from "@/components/users/ForcePasswordChangeDialog";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { UserRoleBadge } from "@/components/users/UserRoleBadge";
import { UserStatusBadge } from "@/components/users/UserStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import {
  useAssignUserSchoolsMutation,
  useUpdateUserMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
  useUserDetailQuery,
} from "@/lib/admin/use-users-queries";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/format";

type UserDetailPageProps = {
  userId: string;
};

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const { user: currentUser } = useAuth();
  const userQuery = useUserDetailQuery(userId);
  const schoolsQuery = useSchoolsListQuery();
  const updateMutation = useUpdateUserMutation();
  const statusMutation = useUpdateUserStatusMutation();
  const roleMutation = useUpdateUserRoleMutation();
  const assignSchoolsMutation = useAssignUserSchoolsMutation();

  const [resetOpen, setResetOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);

  const user = userQuery.data;
  const isSelf = currentUser?.id === userId;

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setSelectedSchoolIds(user.schoolIds);
  }, [user]);

  const schoolNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const school of schoolsQuery.data ?? []) {
      map[school.id] = school.name;
    }
    return map;
  }, [schoolsQuery.data]);

  const handleRefresh = () => {
    void userQuery.refetch();
  };

  if (userQuery.isLoading) {
    return <ClassroomsSkeleton />;
  }

  if (userQuery.isError || !user) {
    return (
      <SchoolsError
        message="Could not load user."
        onRetry={handleRefresh}
        isRetrying={userQuery.isFetching}
      />
    );
  }

  const saveProfile = () => {
    updateMutation.mutate({
      userId,
      input: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    });
  };

  const toggleSchool = (schoolId: string) => {
    setSelectedSchoolIds((current) =>
      current.includes(schoolId)
        ? current.filter((id) => id !== schoolId)
        : [...current, schoolId],
    );
  };

  const saveSchools = () => {
    assignSchoolsMutation.mutate({ userId, schoolIds: selectedSchoolIds });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/users" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to users
        </Link>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={userQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${userQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <SectionCard title="Profile" description="Basic account information">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="detail-name">Full name</Label>
            <Input id="detail-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-email">Email</Label>
            <Input id="detail-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-phone">Phone</Label>
            <Input id="detail-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={saveProfile} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Role and status" description="Access level and account state">
        <div className="flex flex-wrap items-center gap-3">
          <UserRoleBadge role={user.role} />
          <UserStatusBadge status={user.status} />
          {user.forcePasswordChange ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              Force password change
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="detail-role">Role</Label>
            <select
              id="detail-role"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={user.role}
              disabled={isSelf && user.role === "SUPER_ADMIN"}
              onChange={(e) =>
                roleMutation.mutate({ userId, role: e.target.value })
              }
            >
              <option value="TECHNICIAN">Technician</option>
              <option value="SCHOOL_ADMIN">School Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-status">Status</Label>
            <select
              id="detail-status"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={user.status}
              disabled={isSelf}
              onChange={(e) =>
                statusMutation.mutate({ userId, status: e.target.value })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>
        {isSelf ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You cannot disable your own account or remove your own super admin role.
          </p>
        ) : null}
      </SectionCard>

      {user.role === "SCHOOL_ADMIN" ? (
        <SectionCard title="Assigned schools" description="Schools this admin can manage">
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
            {(schoolsQuery.data ?? []).map((school) => (
              <label key={school.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSchoolIds.includes(school.id)}
                  onChange={() => toggleSchool(school.id)}
                />
                {school.name}
              </label>
            ))}
          </div>
          {user.schoolIds.length > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Current: {user.schoolIds.map((id) => schoolNames[id] ?? id).join(", ")}
            </p>
          ) : null}
          <div className="mt-4">
            <Button onClick={saveSchools} disabled={assignSchoolsMutation.isPending}>
              {assignSchoolsMutation.isPending ? "Saving…" : "Update school assignments"}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Password security" description="Reset credentials and enforce password change">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Password changed</dt>
            <dd>{user.passwordChangedAt ? formatDateTime(user.passwordChangedAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last login</dt>
            <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{user.createdAt ? formatDateTime(user.createdAt) : "—"}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset password
          </Button>
          <Button variant="outline" onClick={() => setForceOpen(true)}>
            <Lock className="mr-2 h-4 w-4" />
            Force password change
          </Button>
        </div>
      </SectionCard>

      <ResetPasswordDialog
        userId={user.id}
        userName={user.name}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
      <ForcePasswordChangeDialog
        userId={user.id}
        userName={user.name}
        open={forceOpen}
        onOpenChange={setForceOpen}
      />
    </div>
  );
}

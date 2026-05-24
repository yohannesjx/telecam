"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  assignAdminFormSchema,
  type AssignAdminFormValues,
} from "@/lib/school-form";
import {
  useAssignSchoolAdminMutation,
  useSchoolAdminsQuery,
} from "@/lib/admin/use-schools-queries";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api";

type SchoolAdminsSectionProps = {
  schoolId: string;
  canAssign: boolean;
  canList?: boolean;
};

export function SchoolAdminsSection({
  schoolId,
  canAssign,
  canList = canAssign,
}: SchoolAdminsSectionProps) {
  const adminsQuery = useSchoolAdminsQuery(schoolId, canList);
  const assignMutation = useAssignSchoolAdminMutation();

  const form = useForm<AssignAdminFormValues>({
    resolver: zodResolver(assignAdminFormSchema),
    defaultValues: { user_id: "" },
  });

  const forbidden =
    adminsQuery.isError &&
    (isForbiddenError(adminsQuery.error) ||
      (adminsQuery.error instanceof ApiError && adminsQuery.error.status === 403));

  const onAssign = form.handleSubmit(async (values) => {
    try {
      await assignMutation.mutateAsync({
        schoolId,
        input: { user_id: values.user_id },
      });
      toast.success("School admin assigned.");
      form.reset({ user_id: "" });
    } catch (err) {
      if (isForbiddenError(err)) {
        toast.error(FORBIDDEN_MESSAGE);
      } else {
        toast.error("Could not assign school admin.");
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned school admins</CardTitle>
        <CardDescription>
          Users with the SCHOOL_ADMIN role assigned to this school.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {adminsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading admins...</p>
        ) : !canList ? (
          <p className="text-sm text-muted-foreground">
            School admin assignments are visible to super admins only.
          </p>
        ) : forbidden ? (
          <p className="text-sm text-muted-foreground">
            {FORBIDDEN_MESSAGE} Only super admins can list and assign school admins.
          </p>
        ) : adminsQuery.isError ? (
          <p className="text-sm text-destructive">Could not load school admins.</p>
        ) : (adminsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No school admins assigned yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {(adminsQuery.data ?? []).map((admin) => (
              <li key={admin.userId ?? admin.id} className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{admin.name ?? admin.email ?? admin.userId}</span>
                <span className="text-muted-foreground">{admin.email}</span>
                <span className="text-muted-foreground">{admin.role}</span>
                <span className="text-muted-foreground">{admin.status}</span>
                <span className="text-muted-foreground">
                  Assigned {formatDateTime(admin.assignedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canAssign ? (
          <form onSubmit={onAssign} className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="assign-admin-id">School admin user ID *</Label>
              <Input
                id="assign-admin-id"
                placeholder="UUID of existing SCHOOL_ADMIN user"
                {...form.register("user_id")}
              />
              {form.formState.errors.user_id ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.user_id.message}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Backend requires the user UUID (must already have role SCHOOL_ADMIN).
              </p>
            </div>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign admin"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

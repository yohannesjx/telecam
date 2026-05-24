"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SchoolBreadcrumbs } from "@/components/schools/SchoolBreadcrumbs";
import { SchoolForm } from "@/components/schools/SchoolForm";
import { SchoolsError } from "@/components/schools/SchoolsError";
import { SchoolsSkeleton } from "@/components/schools/SchoolsSkeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  canEditSchoolFull,
  useSchoolDetailQuery,
  useUpdateSchoolMutation,
} from "@/lib/admin/use-schools-queries";
import { schoolDetailToFormValues } from "@/lib/school-form";
import { useAuth } from "@/lib/auth/auth-context";
import type { SchoolFormValues } from "@/lib/school-form";

export function EditSchoolPage({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const schoolQuery = useSchoolDetailQuery(schoolId);
  const updateMutation = useUpdateSchoolMutation();

  const isSuperAdmin = canEditSchoolFull(user?.role);
  const limited = user?.role === "SCHOOL_ADMIN";

  if (schoolQuery.isLoading) return <SchoolsSkeleton />;
  if (schoolQuery.isError || !schoolQuery.data) {
    return (
      <SchoolsError
        message="Could not load school."
        onRetry={() => void schoolQuery.refetch()}
      />
    );
  }

  const school = schoolQuery.data;

  const onSubmit = async (values: SchoolFormValues) => {
    try {
      await updateMutation.mutateAsync({
        schoolId,
        values,
        canSetStatus: isSuperAdmin,
        limited,
      });
      toast.success("School updated successfully.");
      router.push(`/schools/${schoolId}`);
    } catch (err) {
      if (isForbiddenError(err)) {
        toast.error(FORBIDDEN_MESSAGE);
      } else {
        toast.error("Could not update school.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <SchoolBreadcrumbs
        items={[
          { label: "Schools", href: "/schools" },
          { label: school.name, href: `/schools/${schoolId}` },
          { label: "Edit" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit school</CardTitle>
          <CardDescription>
            {limited
              ? "School admins can update address and contact details only."
              : "Update school configuration"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolForm
            defaultValues={schoolDetailToFormValues(school)}
            onSubmit={onSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Save changes"
            showStatus={isSuperAdmin}
            disableName={limited}
            disableStatus={limited}
          />
        </CardContent>
      </Card>
    </div>
  );
}

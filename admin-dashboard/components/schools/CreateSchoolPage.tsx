"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SchoolBreadcrumbs } from "@/components/schools/SchoolBreadcrumbs";
import { SchoolForm } from "@/components/schools/SchoolForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { useCreateSchoolMutation } from "@/lib/admin/use-schools-queries";
import { DEFAULT_SCHOOL_TIMEZONE, type SchoolFormValues } from "@/lib/school-form";

const defaultValues: SchoolFormValues = {
  name: "",
  status: "ACTIVE",
  timezone: DEFAULT_SCHOOL_TIMEZONE,
  city: "",
  address: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  notes: "",
};

export function CreateSchoolPage() {
  const router = useRouter();
  const createMutation = useCreateSchoolMutation();

  const onSubmit = async (values: SchoolFormValues) => {
    try {
      const school = await createMutation.mutateAsync(values);
      toast.success("School created successfully.");
      if (school.id) {
        router.push(`/schools/${school.id}`);
      } else {
        router.push("/schools");
      }
    } catch (err) {
      if (isForbiddenError(err)) {
        toast.error(FORBIDDEN_MESSAGE);
      } else {
        toast.error("Could not create school.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <SchoolBreadcrumbs
        items={[
          { label: "Schools", href: "/schools" },
          { label: "New School" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create school</CardTitle>
          <CardDescription>Add a new school to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolForm
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Create school"
            showStatus={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchoolsListQuery } from "@/lib/admin/use-schools-queries";
import { useCreateUserMutation } from "@/lib/admin/use-users-queries";
import type { ManagedUserRole } from "@/lib/admin/users-types";

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional(),
    role: z.enum(["SUPER_ADMIN", "SCHOOL_ADMIN", "TECHNICIAN"]),
    status: z.enum(["ACTIVE", "BLOCKED", "DISABLED"]),
    temporary_password: z.string().min(8, "Password must be at least 8 characters"),
    force_password_change: z.boolean(),
    school_ids: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "SCHOOL_ADMIN" && (!data.school_ids || data.school_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one school for school admin users",
        path: ["school_ids"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function UserForm() {
  const router = useRouter();
  const mutation = useCreateUserMutation();
  const schoolsQuery = useSchoolsListQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "TECHNICIAN",
      status: "ACTIVE",
      temporary_password: "",
      force_password_change: true,
      school_ids: [],
    },
  });

  const role = form.watch("role");
  const schools = schoolsQuery.data ?? [];

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        role: values.role as ManagedUserRole,
        status: values.status,
        temporary_password: values.temporary_password,
        force_password_change: values.force_password_change,
        school_ids: values.role === "SCHOOL_ADMIN" ? values.school_ids : undefined,
      },
      {
        onSuccess: (user) => router.push(`/users/${user.id}`),
      },
    );
  });

  const toggleSchool = (schoolId: string) => {
    const current = form.getValues("school_ids") ?? [];
    const next = current.includes(schoolId)
      ? current.filter((id) => id !== schoolId)
      : [...current, schoolId];
    form.setValue("school_ids", next, { shouldValidate: true });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" {...form.register("phone")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select id="role" className="h-9 w-full rounded-md border px-3 text-sm" {...form.register("role")}>
            <option value="TECHNICIAN">Technician</option>
            <option value="SCHOOL_ADMIN">School Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" className="h-9 w-full rounded-md border px-3 text-sm" {...form.register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {role === "SCHOOL_ADMIN" ? (
        <div className="space-y-2">
          <Label>Assigned schools</Label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
            {schools.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schools available.</p>
            ) : (
              schools.map((school) => {
                const selected = (form.watch("school_ids") ?? []).includes(school.id);
                return (
                  <label key={school.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSchool(school.id)}
                    />
                    {school.name}
                  </label>
                );
              })
            )}
          </div>
          {form.formState.errors.school_ids ? (
            <p className="text-sm text-destructive">{form.formState.errors.school_ids.message}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="temporary_password">Temporary password</Label>
        <Input id="temporary_password" type="password" {...form.register("temporary_password")} />
        {form.formState.errors.temporary_password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.temporary_password.message}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("force_password_change")} />
        Force password change on first login
      </label>

      {mutation.isError ? (
        <p className="text-sm text-destructive">Could not create user. Email may already exist.</p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}

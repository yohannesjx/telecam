"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { RtspUrlField } from "@/components/cameras/RtspUrlField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedSchool } from "@/lib/admin/camera-monitoring-types";
import { CAMERA_QUALITY_OPTIONS } from "@/lib/admin/cameras-types";
import {
  useCreateCameraMutation,
  useSchoolClassroomsQuery,
} from "@/lib/admin/use-cameras-queries";
import {
  createCameraFormSchema,
  toCreateCameraInput,
  type CreateCameraFormValues,
} from "@/lib/rtsp-validation";

type CreateCameraDialogProps = {
  open: boolean;
  onClose: () => void;
  schools: NormalizedSchool[];
  defaultSchoolId?: string;
  lockSchool?: boolean;
};

export function CreateCameraDialog({
  open,
  onClose,
  schools,
  defaultSchoolId = "",
  lockSchool = false,
}: CreateCameraDialogProps) {
  const router = useRouter();
  const createMutation = useCreateCameraMutation();

  const form = useForm<CreateCameraFormValues>({
    resolver: zodResolver(createCameraFormSchema),
    defaultValues: {
      school_id: defaultSchoolId,
      classroom_id: "",
      name: "",
      rtsp_url: "",
      default_quality: "sd_360p",
    },
  });

  const schoolId = form.watch("school_id");
  const classroomsQuery = useSchoolClassroomsQuery(schoolId || null);

  useEffect(() => {
    if (open && defaultSchoolId) {
      form.setValue("school_id", defaultSchoolId);
    }
  }, [open, defaultSchoolId, form]);

  useEffect(() => {
    form.setValue("classroom_id", "");
  }, [schoolId, form]);

  if (!open) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const camera = await createMutation.mutateAsync({
        schoolId: values.school_id,
        input: toCreateCameraInput(values),
      });
      toast.success("Camera created successfully.");
      form.reset({
        school_id: defaultSchoolId || "",
        classroom_id: "",
        name: "",
        rtsp_url: "",
        default_quality: "sd_360p",
      });
      onClose();
      if (camera.id) {
        router.push(`/cameras/${camera.id}`);
      }
    } catch {
      toast.error("Could not create camera. Check your inputs and try again.");
    }
  });

  return (
    <>
      <button
        type="button"
        aria-label="Close create camera dialog"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">Create Camera</h2>
            <p className="text-sm text-muted-foreground">
              Add a new RTSP camera. Credentials are encrypted and never shown again.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="space-y-2">
                <Label htmlFor="create-school">School *</Label>
                <select
                  id="create-school"
                  className={SELECT_CLASS}
                  disabled={lockSchool}
                  {...form.register("school_id")}
                >
                  <option value="">Select a school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.school_id ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.school_id.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-classroom">Classroom *</Label>
                <select
                  id="create-classroom"
                  className={SELECT_CLASS}
                  disabled={!schoolId || classroomsQuery.isLoading}
                  {...form.register("classroom_id")}
                >
                  <option value="">
                    {!schoolId
                      ? "Select a school first"
                      : classroomsQuery.isLoading
                        ? "Loading classrooms..."
                        : "Select a classroom"}
                  </option>
                  {(classroomsQuery.data ?? []).map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.classroom_id ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.classroom_id.message}
                  </p>
                ) : null}
                {classroomsQuery.isError ? (
                  <p className="text-xs text-destructive">
                    Could not load classrooms for this school.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-name">Camera name *</Label>
                <Input id="create-name" placeholder="Classroom A Camera" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                ) : null}
              </div>

              <RtspUrlField required helperText="Required. Stored encrypted; never displayed after save." />

              <div className="space-y-2">
                <Label htmlFor="create-quality">Default quality *</Label>
                <select
                  id="create-quality"
                  className={SELECT_CLASS}
                  {...form.register("default_quality")}
                >
                  {CAMERA_QUALITY_OPTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-muted-foreground">
                New cameras are created with Active status.
              </p>
            </div>

            <div className="flex gap-2 border-t p-6">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? "Creating..." : "Create Camera"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </aside>
    </>
  );
}

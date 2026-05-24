"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { RtspUrlField } from "@/components/cameras/RtspUrlField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAMERA_QUALITY_OPTIONS } from "@/lib/admin/cameras-types";
import type { NormalizedCameraDetail } from "@/lib/admin/cameras-types";
import {
  useSchoolClassroomsQuery,
  useUpdateCameraMutation,
} from "@/lib/admin/use-cameras-queries";
import {
  editCameraFormSchema,
  toUpdateCameraInput,
  type EditCameraFormValues,
} from "@/lib/rtsp-validation";

type EditCameraFormProps = {
  camera: NormalizedCameraDetail;
  canManage: boolean;
  onSaved?: () => void;
};

export function EditCameraForm({ camera, canManage, onSaved }: EditCameraFormProps) {
  const updateMutation = useUpdateCameraMutation();
  const schoolId = camera.schoolId ?? "";
  const classroomsQuery = useSchoolClassroomsQuery(schoolId || null);

  const form = useForm<EditCameraFormValues>({
    resolver: zodResolver(editCameraFormSchema),
    defaultValues: {
      classroom_id: camera.classroomId ?? "",
      name: camera.name,
      rtsp_url: "",
      default_quality:
        (camera.defaultQuality as EditCameraFormValues["default_quality"]) ?? "sd_360p",
      status: camera.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    },
  });

  useEffect(() => {
    form.reset({
      classroom_id: camera.classroomId ?? "",
      name: camera.name,
      rtsp_url: "",
      default_quality:
        (camera.defaultQuality as EditCameraFormValues["default_quality"]) ?? "sd_360p",
      status: camera.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    });
  }, [camera, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        cameraId: camera.id,
        input: toUpdateCameraInput(values),
      });
      form.setValue("rtsp_url", "");
      toast.success("Camera updated successfully.");
      onSaved?.();
    } catch {
      toast.error("Could not update camera.");
    }
  });

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        You have view-only access. Contact a school admin to edit camera configuration.
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Camera name *</Label>
          <Input id="edit-name" {...form.register("name")} />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-classroom">Classroom *</Label>
          <select
            id="edit-classroom"
            className={SELECT_CLASS}
            disabled={!schoolId || classroomsQuery.isLoading}
            {...form.register("classroom_id")}
          >
            <option value="">
              {classroomsQuery.isLoading ? "Loading classrooms..." : "Select a classroom"}
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-quality">Default quality *</Label>
          <select id="edit-quality" className={SELECT_CLASS} {...form.register("default_quality")}>
            {CAMERA_QUALITY_OPTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-status">Status *</Label>
          <select id="edit-status" className={SELECT_CLASS} {...form.register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>

        <RtspUrlField
          placeholder="Enter new RTSP URL to update"
          helperText="Leave blank to keep the existing encrypted URL."
        />

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </FormProvider>
  );
}

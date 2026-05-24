"use client";

import { X } from "lucide-react";
import { toast } from "sonner";

import { ClassroomForm } from "@/components/classrooms/ClassroomForm";
import { ConfirmDisableEntityModal } from "@/components/classrooms/ConfirmDisableEntityModal";
import { Button } from "@/components/ui/button";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  classroomToFormValues,
  formValuesToUpdateClassroom,
  type ClassroomFormValues,
} from "@/lib/entity-form";
import { useUpdateClassroomMutation } from "@/lib/admin/use-classrooms-queries";
import { useState } from "react";

type EditClassroomDialogProps = {
  open: boolean;
  schoolId: string;
  classroom: NormalizedClassroom | null;
  onClose: () => void;
};

export function EditClassroomDialog({
  open,
  schoolId,
  classroom,
  onClose,
}: EditClassroomDialogProps) {
  const updateMutation = useUpdateClassroomMutation();
  const [disableOpen, setDisableOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ClassroomFormValues | null>(null);

  if (!open || !classroom) return null;

  const save = async (values: ClassroomFormValues) => {
    try {
      await updateMutation.mutateAsync({
        schoolId,
        classroomId: classroom.id,
        input: formValuesToUpdateClassroom(values),
      });
      toast.success("Classroom updated.");
      setDisableOpen(false);
      setPendingValues(null);
      onClose();
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not update classroom.");
    }
  };

  const onSubmit = async (values: ClassroomFormValues) => {
    if (values.status === "DISABLED" && classroom.status !== "DISABLED") {
      setPendingValues(values);
      setDisableOpen(true);
      return;
    }
    await save(values);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">Edit classroom</h2>
            <p className="text-sm text-muted-foreground">{classroom.name}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <ClassroomForm
            defaultValues={classroomToFormValues(classroom)}
            onSubmit={onSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Save changes"
          />
        </div>
      </aside>
      <ConfirmDisableEntityModal
        open={disableOpen}
        title="Disable classroom?"
        description={`Disabling ${classroom.name} may affect children and cameras assigned to it.`}
        onClose={() => {
          setDisableOpen(false);
          setPendingValues(null);
        }}
        onConfirm={() => {
          if (pendingValues) void save(pendingValues);
        }}
        isPending={updateMutation.isPending}
      />
    </>
  );
}

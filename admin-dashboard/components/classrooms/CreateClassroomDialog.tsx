"use client";

import { X } from "lucide-react";
import { toast } from "sonner";

import { ClassroomForm } from "@/components/classrooms/ClassroomForm";
import { Button } from "@/components/ui/button";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  formValuesToCreateClassroom,
  type ClassroomFormValues,
} from "@/lib/entity-form";
import { useCreateClassroomMutation } from "@/lib/admin/use-classrooms-queries";

const defaultValues: ClassroomFormValues = {
  name: "",
  status: "ACTIVE",
  notes: "",
};

type CreateClassroomDialogProps = {
  open: boolean;
  schoolId: string;
  onClose: () => void;
};

export function CreateClassroomDialog({ open, schoolId, onClose }: CreateClassroomDialogProps) {
  const createMutation = useCreateClassroomMutation();

  if (!open) return null;

  const onSubmit = async (values: ClassroomFormValues) => {
    try {
      await createMutation.mutateAsync({
        schoolId,
        input: formValuesToCreateClassroom(values),
      });
      toast.success("Classroom created.");
      onClose();
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not create classroom.");
    }
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
            <h2 className="text-lg font-semibold">Create classroom</h2>
            <p className="text-sm text-muted-foreground">Add a classroom to this school</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <ClassroomForm
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Create classroom"
            showStatus={false}
          />
        </div>
      </aside>
    </>
  );
}

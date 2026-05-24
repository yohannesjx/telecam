"use client";

import { X } from "lucide-react";
import { toast } from "sonner";

import { ChildForm } from "@/components/children/ChildForm";
import { Button } from "@/components/ui/button";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  formValuesToCreateChild,
  type ChildFormValues,
} from "@/lib/entity-form";
import { useCreateChildMutation } from "@/lib/admin/use-children-queries";

const defaultValues: ChildFormValues = {
  first_name: "",
  last_name: "",
  classroom_id: "",
  status: "ACTIVE",
  notes: "",
};

type CreateChildDialogProps = {
  open: boolean;
  schoolId: string;
  classrooms: NormalizedClassroom[];
  defaultClassroomId?: string;
  onClose: () => void;
};

export function CreateChildDialog({
  open,
  schoolId,
  classrooms,
  defaultClassroomId = "",
  onClose,
}: CreateChildDialogProps) {
  const createMutation = useCreateChildMutation();

  if (!open) return null;

  const onSubmit = async (values: ChildFormValues) => {
    try {
      await createMutation.mutateAsync({
        schoolId,
        input: formValuesToCreateChild(values),
      });
      toast.success("Child added.");
      onClose();
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not create child.");
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
            <h2 className="text-lg font-semibold">Create child</h2>
            <p className="text-sm text-muted-foreground">Enroll a child in a classroom</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <ChildForm
            defaultValues={{
              ...defaultValues,
              classroom_id: defaultClassroomId,
            }}
            classrooms={classrooms}
            onSubmit={onSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Create child"
            showStatus={false}
          />
        </div>
      </aside>
    </>
  );
}

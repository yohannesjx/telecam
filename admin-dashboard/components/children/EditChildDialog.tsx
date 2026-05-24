"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { ChildForm } from "@/components/children/ChildForm";
import { ConfirmDisableEntityModal } from "@/components/classrooms/ConfirmDisableEntityModal";
import { Button } from "@/components/ui/button";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import type { NormalizedChild } from "@/lib/admin/children-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  childToFormValues,
  formValuesToUpdateChild,
  type ChildFormValues,
} from "@/lib/entity-form";
import { useUpdateChildMutation } from "@/lib/admin/use-children-queries";

type EditChildDialogProps = {
  open: boolean;
  schoolId: string;
  child: NormalizedChild | null;
  classrooms: NormalizedClassroom[];
  focusClassroom?: boolean;
  onClose: () => void;
};

export function EditChildDialog({
  open,
  schoolId,
  child,
  classrooms,
  focusClassroom = false,
  onClose,
}: EditChildDialogProps) {
  const updateMutation = useUpdateChildMutation();
  const [disableOpen, setDisableOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ChildFormValues | null>(null);

  if (!open || !child) return null;

  const save = async (values: ChildFormValues) => {
    try {
      await updateMutation.mutateAsync({
        schoolId,
        childId: child.id,
        input: formValuesToUpdateChild(values),
      });
      toast.success("Child updated.");
      setDisableOpen(false);
      setPendingValues(null);
      onClose();
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not update child.");
    }
  };

  const onSubmit = async (values: ChildFormValues) => {
    if (values.status === "DISABLED" && child.status !== "DISABLED") {
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
            <h2 className="text-lg font-semibold">
              {focusClassroom ? "Change classroom" : "Edit child"}
            </h2>
            <p className="text-sm text-muted-foreground">{child.name}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <ChildForm
            defaultValues={childToFormValues(child)}
            classrooms={classrooms}
            onSubmit={onSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Save changes"
            focusClassroom={focusClassroom}
          />
        </div>
      </aside>
      <ConfirmDisableEntityModal
        open={disableOpen}
        title="Disable child?"
        description={`Disabling ${child.name} will remove active enrollment status.`}
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

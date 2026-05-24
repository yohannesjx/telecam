"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { useCreateSubscriptionMutation } from "@/lib/admin/use-billing-queries";
import {
  subscriptionFormSchema,
  subscriptionFormToInput,
  type SubscriptionFormValues,
} from "@/lib/billing-form";

type Option = { id: string; label: string };

const defaults: SubscriptionFormValues = {
  parent_id: "",
  school_id: "",
  status: "ACTIVE",
  starts_at: new Date().toISOString().slice(0, 10),
  ends_at: "",
  notes: "",
};

export function CreateSubscriptionDialog({
  open,
  onClose,
  schools,
  parents,
  defaultParentId,
  defaultSchoolId,
}: {
  open: boolean;
  onClose: () => void;
  schools: Option[];
  parents: Option[];
  defaultParentId?: string;
  defaultSchoolId?: string;
}) {
  const mutation = useCreateSubscriptionMutation();
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      ...defaults,
      parent_id: defaultParentId ?? "",
      school_id: defaultSchoolId ?? "",
    },
  });

  if (!open) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(subscriptionFormToInput(values));
      toast.success("Subscription created.");
      onClose();
      form.reset(defaults);
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not create subscription.");
    }
  });

  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">Create subscription</h2>
            <p className="text-sm text-muted-foreground">Grant parent playback access</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Parent</Label>
              <select className="h-8 w-full rounded-lg border px-2 text-sm" {...form.register("parent_id")}>
                <option value="">Select parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>School</Label>
              <select className="h-8 w-full rounded-lg border px-2 text-sm" {...form.register("school_id")}>
                <option value="">Select school</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="h-8 w-full rounded-lg border px-2 text-sm" {...form.register("status")}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIAL">TRIAL</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" {...form.register("starts_at")} />
            </div>
            <div className="space-y-2">
              <Label>End date (optional)</Label>
              <Input type="date" {...form.register("ends_at")} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>Create</Button>
          </div>
        </form>
      </aside>
    </>
  );
}

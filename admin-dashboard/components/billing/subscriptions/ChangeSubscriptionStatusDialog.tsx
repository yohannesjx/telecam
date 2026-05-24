"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { NormalizedSubscription } from "@/lib/admin/billing-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { useUpdateSubscriptionStatusMutation } from "@/lib/admin/use-billing-queries";
import { changeStatusSchema } from "@/lib/billing-form";
import type { z } from "zod";

type StatusValues = z.infer<typeof changeStatusSchema>;

export function ChangeSubscriptionStatusDialog({
  subscription,
  onClose,
}: {
  subscription: NormalizedSubscription | null;
  onClose: () => void;
}) {
  const mutation = useUpdateSubscriptionStatusMutation();
  const form = useForm<StatusValues>({
    resolver: zodResolver(changeStatusSchema),
    defaultValues: { status: "ACTIVE" },
  });

  if (!subscription) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ id: subscription.id, input: { status: values.status } });
      toast.success("Subscription status updated.");
      onClose();
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not update status.");
    }
  });

  return (
    <div className="surface-card p-4">
      <h3 className="font-medium">Change status — {subscription.parentName}</h3>
      <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>New status</Label>
          <select className="h-8 rounded-lg border px-2 text-sm" {...form.register("status")}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={mutation.isPending}>Save</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </form>
    </div>
  );
}

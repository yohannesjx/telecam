"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedSubscription } from "@/lib/admin/billing-types";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { useExtendSubscriptionMutation } from "@/lib/admin/use-billing-queries";
import { buildExtendEndsAt, extendSubscriptionSchema } from "@/lib/billing-form";

type ExtendValues = z.infer<typeof extendSubscriptionSchema>;

export function ExtendSubscriptionDialog({
  subscription,
  onClose,
}: {
  subscription: NormalizedSubscription | null;
  onClose: () => void;
}) {
  const mutation = useExtendSubscriptionMutation();
  const form = useForm<ExtendValues>({
    resolver: zodResolver(extendSubscriptionSchema),
    defaultValues: { days: 30 },
  });

  if (!subscription) return null;

  const applyDays = (days: number) => form.setValue("days", days);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        id: subscription.id,
        input: { ends_at: buildExtendEndsAt(subscription.endsAt, values.days) },
      });
      toast.success("Subscription extended.");
      onClose();
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error("Could not extend subscription.");
    }
  });

  return (
    <div className="surface-card p-4">
      <h3 className="font-medium">Extend subscription — {subscription.parentName}</h3>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((d) => (
            <Button key={d} type="button" variant="outline" size="sm" onClick={() => applyDays(d)}>
              +{d} days
            </Button>
          ))}
        </div>
        <div className="space-y-1">
          <Label>Custom days</Label>
          <Input type="number" min={1} {...form.register("days", { valueAsNumber: true })} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={mutation.isPending}>Extend</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

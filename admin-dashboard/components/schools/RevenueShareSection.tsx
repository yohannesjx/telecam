"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import {
  revenueShareFormSchema,
  type RevenueShareFormValues,
} from "@/lib/school-form";
import {
  useSchoolRevenueShareQuery,
  useSetRevenueShareMutation,
} from "@/lib/admin/use-schools-queries";
import { formatDateTime } from "@/lib/format";

type RevenueShareSectionProps = {
  schoolId: string;
  canEdit: boolean;
};

export function RevenueShareSection({ schoolId, canEdit }: RevenueShareSectionProps) {
  const revenueQuery = useSchoolRevenueShareQuery(schoolId);
  const setMutation = useSetRevenueShareMutation();

  const form = useForm<RevenueShareFormValues>({
    resolver: zodResolver(revenueShareFormSchema),
    defaultValues: {
      school_share_percent: 70,
      platform_share_percent: 30,
      active_from: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const schoolShare = form.watch("school_share_percent");

  useEffect(() => {
    const platform = Math.round((100 - Number(schoolShare || 0)) * 100) / 100;
    form.setValue("platform_share_percent", platform);
  }, [schoolShare, form]);

  useEffect(() => {
    if (revenueQuery.data) {
      form.reset({
        school_share_percent: revenueQuery.data.schoolSharePercent ?? 70,
        platform_share_percent: revenueQuery.data.platformSharePercent ?? 30,
        active_from:
          revenueQuery.data.effectiveFrom?.slice(0, 10) ??
          new Date().toISOString().slice(0, 10),
        notes: revenueQuery.data.notes ?? "",
      });
    }
  }, [revenueQuery.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await setMutation.mutateAsync({
        schoolId,
        input: {
          percentage: values.school_share_percent,
          active_from: values.active_from,
        },
      });
      toast.success("Revenue share updated.");
    } catch (err) {
      if (isForbiddenError(err)) {
        toast.error(FORBIDDEN_MESSAGE);
      } else {
        toast.error("Could not update revenue share.");
      }
    }
  });

  const share = revenueQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue share</CardTitle>
        <CardDescription>School vs platform revenue split for billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {revenueQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading revenue share...</p>
        ) : share ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">School share</dt>
              <dd className="font-medium">{share.schoolSharePercent ?? "—"}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Platform share</dt>
              <dd className="font-medium">{share.platformSharePercent ?? "—"}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Effective from</dt>
              <dd className="font-medium">{formatDateTime(share.effectiveFrom)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No active revenue share configured.</p>
        )}

        {canEdit ? (
          <form onSubmit={onSubmit} className="space-y-3 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-share">School share % *</Label>
                <Input
                  id="school-share"
                  type="number"
                  min={0}
                  max={100}
                  {...form.register("school_share_percent", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform-share">Platform share % *</Label>
                <Input
                  id="platform-share"
                  type="number"
                  readOnly
                  {...form.register("platform_share_percent", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active-from">Effective from *</Label>
              <Input id="active-from" type="date" {...form.register("active_from")} />
            </div>
            {form.formState.errors.platform_share_percent ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.platform_share_percent.message}
              </p>
            ) : null}
            <Button type="submit" disabled={setMutation.isPending}>
              {setMutation.isPending ? "Saving..." : "Update revenue share"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

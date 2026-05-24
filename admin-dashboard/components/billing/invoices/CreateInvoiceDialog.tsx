"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "@/lib/admin/schools-api";
import { useCreateInvoiceMutation } from "@/lib/admin/use-billing-queries";
import {
  invoiceFormSchema,
  invoiceFormToInput,
  type InvoiceFormValues,
} from "@/lib/billing-form";

type Option = { id: string; label: string };

const defaults: InvoiceFormValues = {
  parent_id: "",
  school_id: "",
  amount: "",
  currency: "ETB",
  due_date: "",
  description: "",
  notes: "",
  subscription_id: "",
};

export function CreateInvoiceDialog({
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
  const mutation = useCreateInvoiceMutation();
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      ...defaults,
      parent_id: defaultParentId ?? "",
      school_id: defaultSchoolId ?? "",
    },
  });

  if (!open) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(invoiceFormToInput(values));
      toast.success("Invoice created.");
      onClose();
      form.reset(defaults);
    } catch (err) {
      if (isForbiddenError(err)) toast.error(FORBIDDEN_MESSAGE);
      else toast.error(err instanceof Error ? err.message : "Could not create invoice.");
    }
  });

  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">Create invoice</h2>
            <p className="text-sm text-muted-foreground">Issue a manual invoice</p>
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
              <Label>Amount (ETB)</Label>
              <Input placeholder="1200.00" {...form.register("amount")} />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" {...form.register("due_date")} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...form.register("description")} />
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

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parentFormSchema, type ParentFormValues, toCreateParentInput } from "@/lib/parent-form";
import { useCreateParentMutation } from "@/lib/admin/use-parents-queries";

export function ParentForm() {
  const router = useRouter();
  const mutation = useCreateParentMutation();
  const form = useForm<ParentFormValues>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: { full_name: "", email: "", phone: "", password: "", status: "ACTIVE" },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(toCreateParentInput(values), {
      onSuccess: (parent) => router.push(parent.id ? `/parents/${parent.id}` : "/parents"),
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input placeholder="Full name" {...form.register("full_name")} />
      <Input placeholder="Email" type="email" {...form.register("email")} />
      <Input placeholder="Phone (optional)" {...form.register("phone")} />
      <Input placeholder="Password" type="password" {...form.register("password")} />
      <select className="h-8 rounded border px-2 text-sm" {...form.register("status")}>
        <option value="ACTIVE">ACTIVE</option>
        <option value="BLOCKED">BLOCKED</option>
        <option value="DISABLED">DISABLED</option>
      </select>
      <Button type="submit" disabled={mutation.isPending}>Create parent</Button>
    </form>
  );
}

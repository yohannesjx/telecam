import { z } from "zod";

import type { NormalizedChild } from "@/lib/admin/children-types";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";
import { splitFullName } from "@/lib/admin/children-normalizer";
import type { CreateChildInput, UpdateChildInput } from "@/lib/admin/children-types";
import type {
  CreateClassroomInput,
  UpdateClassroomInput,
} from "@/lib/admin/classrooms-types";

export const classroomFormSchema = z.object({
  name: z.string().trim().min(1, "Classroom name is required"),
  status: z.enum(["ACTIVE", "DISABLED"]),
  notes: z.string().trim().optional(),
});

export type ClassroomFormValues = z.infer<typeof classroomFormSchema>;

export const childFormSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().optional(),
  classroom_id: z.string().uuid("Select a classroom"),
  status: z.enum(["ACTIVE", "DISABLED"]),
  notes: z.string().trim().optional(),
});

export type ChildFormValues = z.infer<typeof childFormSchema>;

export function classroomToFormValues(room: NormalizedClassroom): ClassroomFormValues {
  return {
    name: room.name,
    status: room.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    notes: room.notes ?? room.ageGroup ?? "",
  };
}

export function childToFormValues(child: NormalizedChild): ChildFormValues {
  return {
    first_name: child.firstName ?? splitFullName(child.name).firstName,
    last_name: child.lastName ?? "",
    classroom_id: child.classroomId ?? "",
    status: child.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    notes: child.notes ?? "",
  };
}

export function formValuesToCreateClassroom(values: ClassroomFormValues): CreateClassroomInput {
  return {
    name: values.name,
    status: values.status,
    notes: values.notes,
  };
}

export function formValuesToUpdateClassroom(values: ClassroomFormValues): UpdateClassroomInput {
  return formValuesToCreateClassroom(values);
}

export function buildFullName(firstName: string, lastName?: string): string {
  return `${firstName.trim()} ${(lastName ?? "").trim()}`.trim();
}

export function formValuesToCreateChild(values: ChildFormValues): CreateChildInput {
  return {
    full_name: buildFullName(values.first_name, values.last_name),
    classroom_id: values.classroom_id,
    status: values.status,
  };
}

export function formValuesToUpdateChild(values: ChildFormValues): UpdateChildInput {
  return {
    full_name: buildFullName(values.first_name, values.last_name),
    classroom_id: values.classroom_id,
    status: values.status,
  };
}

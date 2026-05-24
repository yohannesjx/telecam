import { apiFetch } from "@/lib/api";
import {
  normalizeClassroomDetail,
  normalizeClassrooms,
} from "@/lib/admin/classrooms-normalizer";
import type {
  CreateClassroomInput,
  NormalizedClassroom,
  UpdateClassroomInput,
} from "@/lib/admin/classrooms-types";

function notesToAgeGroup(notes?: string): string {
  return notes?.trim() ?? "";
}

export async function getSchoolClassrooms(schoolId: string): Promise<NormalizedClassroom[]> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/classrooms`,
    { method: "GET" },
  );
  return normalizeClassrooms(raw);
}

export async function createClassroom(
  schoolId: string,
  input: CreateClassroomInput,
): Promise<NormalizedClassroom> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/classrooms`,
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        age_group: notesToAgeGroup(input.notes),
      }),
    },
  );
  return normalizeClassroomDetail(raw);
}

export async function updateClassroom(
  classroomId: string,
  input: UpdateClassroomInput,
): Promise<NormalizedClassroom> {
  const body: Record<string, string> = {};
  if (input.name) body.name = input.name;
  if (input.status) body.status = input.status;
  if (input.notes !== undefined) body.age_group = notesToAgeGroup(input.notes);

  const raw = await apiFetch<unknown>(
    `/admin/classrooms/${encodeURIComponent(classroomId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return normalizeClassroomDetail(raw);
}

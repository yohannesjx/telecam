import { apiFetch } from "@/lib/api";
import {
  normalizeChildDetail,
  normalizeChildren,
} from "@/lib/admin/children-normalizer";
import type {
  CreateChildInput,
  NormalizedChild,
  UpdateChildInput,
} from "@/lib/admin/children-types";

export async function getSchoolChildren(
  schoolId: string,
  classroomId?: string,
): Promise<NormalizedChild[]> {
  const query = classroomId
    ? `?classroom_id=${encodeURIComponent(classroomId)}`
    : "";
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/children${query}`,
    { method: "GET" },
  );
  return normalizeChildren(raw);
}

export async function createChild(
  schoolId: string,
  input: CreateChildInput,
): Promise<NormalizedChild> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/children`,
    {
      method: "POST",
      body: JSON.stringify({
        full_name: input.full_name,
        classroom_id: input.classroom_id,
      }),
    },
  );
  return normalizeChildDetail(raw);
}

export async function updateChild(
  childId: string,
  input: UpdateChildInput,
): Promise<NormalizedChild> {
  const body: Record<string, string> = {};
  if (input.full_name) body.full_name = input.full_name;
  if (input.classroom_id) body.classroom_id = input.classroom_id;
  if (input.status) body.status = input.status;

  const raw = await apiFetch<unknown>(
    `/admin/children/${encodeURIComponent(childId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return normalizeChildDetail(raw);
}

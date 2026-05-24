import { ApiError, apiFetch } from "@/lib/api";
import { getSchoolChildren } from "@/lib/admin/children-api";
import { getSchools } from "@/lib/admin/schools-api";
import {
  normalizeLinkedChild,
  normalizeParent,
  normalizeParentDetail,
  normalizeParents,
} from "@/lib/admin/parents-normalizer";
import type {
  CreateParentInput,
  LinkParentToChildInput,
  NormalizedParent,
  NormalizedParentDetail,
} from "@/lib/admin/parents-types";

export async function getParents(): Promise<NormalizedParent[]> {
  try {
    const raw = await apiFetch<unknown>("/admin/parents", { method: "GET" });
    return normalizeParents(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [];
    throw err;
  }
}

export async function createParent(input: CreateParentInput): Promise<NormalizedParent> {
  const raw = await apiFetch<unknown>("/admin/parents", {
    method: "POST",
    body: JSON.stringify({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone ?? "",
      password: input.password,
    }),
  });
  const payload = typeof raw === "object" && raw !== null && "data" in raw ? (raw as { data: unknown }).data : raw;
  return normalizeParent(payload);
}

export async function getChildParents(childId: string): Promise<NormalizedParent[]> {
  const raw = await apiFetch<unknown>(`/admin/children/${encodeURIComponent(childId)}/parents`, {
    method: "GET",
  });
  return normalizeParents(raw);
}

export async function linkParentToChild(
  childId: string,
  input: LinkParentToChildInput,
): Promise<void> {
  await apiFetch<unknown>(`/admin/children/${encodeURIComponent(childId)}/parents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getParentById(parentId: string): Promise<NormalizedParentDetail | null> {
  const parents = await getParents();
  const parent = parents.find((p) => p.id === parentId);
  if (!parent) return null;

  try {
    const schools = await getSchools();
    const linkedChildren: ReturnType<typeof normalizeLinkedChild>[] = [];

    for (const school of schools) {
      const children = await getSchoolChildren(school.id);
      for (const child of children) {
        const parentsForChild = await getChildParents(child.id).catch(() => []);
        const linked = parentsForChild.find((p) => p.id === parentId);
        if (linked) {
          linkedChildren.push(
            normalizeLinkedChild({
              id: child.id,
              full_name: child.name,
              school_id: school.id,
              school_name: school.name,
              classroom_id: child.classroomId,
              classroom_name: child.classroomName,
              status: child.status,
              relationship: null,
              linked_at: null,
            }),
          );
        }
      }
    }

    return normalizeParentDetail(parent, linkedChildren);
  } catch {
    return normalizeParentDetail(parent, []);
  }
}

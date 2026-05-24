import type { EntityStatus, NormalizedChild } from "@/lib/admin/children-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeStatus(value: unknown): EntityStatus {
  const s = String(value ?? "").toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "DISABLED") return "DISABLED";
  return "UNKNOWN";
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

export function normalizeChild(raw: unknown): NormalizedChild {
  const row = isRecord(raw) ? raw : {};
  const fullName =
    str(pick(row, ["full_name", "fullName", "name"])) ?? "Unknown child";
  const { firstName, lastName } = splitFullName(fullName);
  return {
    id: str(pick(row, ["id", "child_id"])) ?? "",
    childId: str(pick(row, ["child_id", "childId"])) ?? null,
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    classroomId: str(pick(row, ["classroom_id", "classroomId"])) ?? null,
    classroomName: str(pick(row, ["classroom_name", "classroomName"])) ?? null,
    firstName,
    lastName: lastName || null,
    name: fullName,
    status: normalizeStatus(pick(row, ["status"])),
    dateOfBirth: str(pick(row, ["date_of_birth", "dateOfBirth"])) ?? null,
    linkedParentsCount: num(pick(row, ["linked_parents_count", "linkedParentsCount"])),
    notes: null,
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeChildren(raw: unknown): NormalizedChild[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["children", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map((row) => normalizeChild(row));
}

export function normalizeChildDetail(raw: unknown): NormalizedChild {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const row = isRecord(payload) ? pick(payload, ["child"]) ?? payload : payload;
  return normalizeChild(isRecord(row) ? row : payload);
}

export function enrichChildrenWithClassroomNames(
  children: NormalizedChild[],
  classrooms: { id: string; name: string }[],
): NormalizedChild[] {
  const map = new Map(classrooms.map((c) => [c.id, c.name]));
  return children.map((child) => ({
    ...child,
    classroomName:
      child.classroomName ??
      (child.classroomId ? map.get(child.classroomId) ?? null : null),
  }));
}

export function filterChildren(
  children: NormalizedChild[],
  filters: { search: string; status: string; classroomId: string },
): NormalizedChild[] {
  const q = filters.search.trim().toLowerCase();
  return children.filter((child) => {
    if (filters.status !== "all" && child.status !== filters.status) return false;
    if (filters.classroomId && child.classroomId !== filters.classroomId) return false;
    if (!q) return true;
    const haystack = [child.name, child.classroomName, child.classroomId, child.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

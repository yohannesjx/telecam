import type {
  EntityStatus,
  NormalizedClassroom,
} from "@/lib/admin/classrooms-types";

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

export function normalizeClassroom(raw: unknown): NormalizedClassroom {
  const row = isRecord(raw) ? raw : {};
  const ageGroup = str(pick(row, ["age_group", "ageGroup"]));
  return {
    id: str(pick(row, ["id", "classroom_id"])) ?? "",
    schoolId: str(pick(row, ["school_id", "schoolId"])) ?? null,
    name: str(pick(row, ["name"])) ?? "Unknown classroom",
    status: normalizeStatus(pick(row, ["status"])),
    ageGroup: ageGroup ?? null,
    notes: ageGroup ?? null,
    childrenCount: num(pick(row, ["children_count", "childrenCount"])),
    camerasCount: num(pick(row, ["cameras_count", "camerasCount"])),
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeClassrooms(raw: unknown): NormalizedClassroom[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["classrooms", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map((row) => normalizeClassroom(row));
}

export function normalizeClassroomDetail(raw: unknown): NormalizedClassroom {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const row = isRecord(payload) ? pick(payload, ["classroom"]) ?? payload : payload;
  return normalizeClassroom(isRecord(row) ? row : payload);
}

export function filterClassrooms(
  classrooms: NormalizedClassroom[],
  filters: { search: string; status: string },
): NormalizedClassroom[] {
  const q = filters.search.trim().toLowerCase();
  return classrooms.filter((room) => {
    if (filters.status !== "all" && room.status !== filters.status) return false;
    if (!q) return true;
    const haystack = [room.name, room.notes, room.id].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function enrichClassroomsWithCounts(
  classrooms: NormalizedClassroom[],
  childrenByClassroom: Map<string, number>,
  camerasByClassroom: Map<string, number>,
): NormalizedClassroom[] {
  return classrooms.map((room) => ({
    ...room,
    childrenCount: childrenByClassroom.get(room.id) ?? room.childrenCount,
    camerasCount: camerasByClassroom.get(room.id) ?? room.camerasCount,
  }));
}

import type {
  NormalizedChildSummary,
  NormalizedClassroomSummary,
  NormalizedRevenueShare,
  NormalizedSchool,
  NormalizedSchoolAdmin,
  NormalizedSchoolDetail,
  NormalizedStorageUsageRow,
  SchoolStatus,
} from "@/lib/admin/schools-types";

const META_START = "---school-meta---";
const META_END = "---end-meta---";

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

function normalizeSchoolStatus(value: unknown): SchoolStatus {
  const s = String(value ?? "").toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "DISABLED") return "DISABLED";
  return "UNKNOWN";
}

export type SchoolMetaFields = {
  timezone?: string;
  city?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
  streetAddress?: string;
};

export function encodeSchoolAddress(meta: SchoolMetaFields): string {
  const metaLines: string[] = [];
  if (meta.timezone) metaLines.push(`timezone: ${meta.timezone}`);
  if (meta.city) metaLines.push(`city: ${meta.city}`);
  if (meta.contactName) metaLines.push(`contact_name: ${meta.contactName}`);
  if (meta.contactEmail) metaLines.push(`contact_email: ${meta.contactEmail}`);
  if (meta.notes) metaLines.push(`notes: ${meta.notes}`);

  const street = meta.streetAddress?.trim() ?? "";
  if (metaLines.length === 0) return street;

  return `${META_START}\n${metaLines.join("\n")}\n${META_END}\n${street}`.trim();
}

export function decodeSchoolAddress(address?: string | null): SchoolMetaFields {
  const raw = address ?? "";
  const start = raw.indexOf(META_START);
  if (start === -1) {
    return { streetAddress: raw.trim() || undefined };
  }
  const end = raw.indexOf(META_END, start);
  const metaBlock = end === -1 ? raw.slice(start + META_START.length) : raw.slice(start + META_START.length, end);
  const streetAddress =
    end === -1 ? "" : raw.slice(end + META_END.length).trim();

  const fields: SchoolMetaFields = { streetAddress: streetAddress || undefined };
  for (const line of metaBlock.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === "timezone") fields.timezone = value;
    if (key === "city") fields.city = value;
    if (key === "contact_name") fields.contactName = value;
    if (key === "contact_email") fields.contactEmail = value;
    if (key === "notes") fields.notes = value;
  }
  return fields;
}

export function normalizeSchool(raw: unknown): NormalizedSchool {
  const row = isRecord(raw) ? raw : {};
  const address = str(pick(row, ["address"])) ?? null;
  const meta = decodeSchoolAddress(address);
  const phone = str(pick(row, ["phone", "contact_phone", "contactPhone"])) ?? null;

  return {
    id: str(pick(row, ["id", "school_id", "schoolId"])) ?? "",
    name: str(pick(row, ["name"])) ?? "Unknown school",
    status: normalizeSchoolStatus(pick(row, ["status"])),
    timezone: meta.timezone ?? null,
    city: meta.city ?? null,
    address: meta.streetAddress ?? address,
    contactName: meta.contactName ?? null,
    contactPhone: phone,
    contactEmail: meta.contactEmail ?? null,
    classroomsCount: num(pick(row, ["classrooms_count", "classroomsCount"])),
    childrenCount: num(pick(row, ["children_count", "childrenCount"])),
    camerasCount: num(pick(row, ["cameras_count", "camerasCount"])),
    parentsCount: num(pick(row, ["parents_count", "parentsCount"])),
    createdAt: str(pick(row, ["created_at", "createdAt"])) ?? null,
    updatedAt: str(pick(row, ["updated_at", "updatedAt"])) ?? null,
  };
}

export function normalizeSchoolDetail(raw: unknown): NormalizedSchoolDetail {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const row = isRecord(payload) ? pick(payload, ["school"]) ?? payload : payload;
  const school = normalizeSchool(row);
  const meta = decodeSchoolAddress(
    isRecord(row) ? str(pick(row, ["address"])) : school.address,
  );
  return {
    ...school,
    notes: meta.notes ?? null,
  };
}

export function normalizeSchools(raw: unknown): NormalizedSchool[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? pick(payload, ["schools", "data", "items"])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).map((row) => normalizeSchool(row));
}

export function normalizeSchoolAdmin(raw: unknown): NormalizedSchoolAdmin {
  const row = isRecord(raw) ? raw : {};
  return {
    id: str(pick(row, ["id", "user_id", "userId"])),
    userId: str(pick(row, ["id", "user_id", "userId"])),
    email: str(pick(row, ["email"])) ?? null,
    name: str(pick(row, ["full_name", "fullName", "name"])) ?? null,
    role: str(pick(row, ["role"])) ?? null,
    status: str(pick(row, ["status"])) ?? null,
    assignedAt: str(pick(row, ["assigned_at", "assignedAt", "created_at"])) ?? null,
  };
}

export function normalizeSchoolAdmins(raw: unknown): NormalizedSchoolAdmin[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((row) => normalizeSchoolAdmin(row));
}

export function normalizeRevenueShare(raw: unknown): NormalizedRevenueShare | null {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  if (!isRecord(payload)) return null;
  const pct = num(pick(payload, ["percentage", "school_share_percent", "schoolSharePercent"]));
  const schoolShare = pct ?? 0;
  return {
    id: str(pick(payload, ["id"])),
    schoolId: str(pick(payload, ["school_id", "schoolId"])),
    schoolSharePercent: schoolShare,
    platformSharePercent: schoolShare !== null ? Math.round((100 - schoolShare) * 100) / 100 : null,
    effectiveFrom: str(pick(payload, ["active_from", "activeFrom", "effective_from"])) ?? null,
    effectiveTo: str(pick(payload, ["active_to", "activeTo", "effective_to"])) ?? null,
  };
}

export function normalizeClassrooms(raw: unknown): NormalizedClassroomSummary[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .filter(isRecord)
    .map((row) => ({
      id: str(pick(row, ["id"])) ?? "",
      name: str(pick(row, ["name"])) ?? "Unknown",
      status: str(pick(row, ["status"])),
      childrenCount: num(pick(row, ["children_count", "childrenCount"])),
      camerasCount: num(pick(row, ["cameras_count", "camerasCount"])),
    }))
    .filter((c) => c.id !== "");
}

export function normalizeChildren(raw: unknown): NormalizedChildSummary[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .filter(isRecord)
    .map((row) => ({
      id: str(pick(row, ["id"])) ?? "",
      fullName: str(pick(row, ["full_name", "fullName", "name"])) ?? "Unknown",
      classroomId: str(pick(row, ["classroom_id", "classroomId"])) ?? null,
      classroomName: str(pick(row, ["classroom_name", "classroomName"])) ?? null,
      status: str(pick(row, ["status"])),
    }))
    .filter((c) => c.id !== "");
}

export function normalizeStorageUsage(raw: unknown): NormalizedStorageUsageRow[] {
  const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .filter(isRecord)
    .map((row) => ({
      schoolId: str(pick(row, ["school_id", "schoolId"])) ?? "",
      schoolName: str(pick(row, ["school_name", "schoolName"])),
      date: str(pick(row, ["date"])) ?? "",
      totalBytes: num(pick(row, ["total_bytes", "totalBytes"])) ?? 0,
      totalGb: num(pick(row, ["total_gb", "totalGB"])) ?? 0,
      segmentCount: num(pick(row, ["segment_count", "segmentCount"])) ?? 0,
      estimatedCostUsd: num(pick(row, ["estimated_cost_usd", "estimatedCostUsd"])),
    }))
    .filter((r) => r.schoolId !== "");
}

export function filterSchools(
  schools: NormalizedSchool[],
  filters: { search: string; status: string },
): NormalizedSchool[] {
  const q = filters.search.trim().toLowerCase();
  return schools.filter((school) => {
    if (filters.status !== "all" && school.status !== filters.status) return false;
    if (!q) return true;
    const haystack = [
      school.name,
      school.city,
      school.address,
      school.timezone,
      school.contactEmail,
      school.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

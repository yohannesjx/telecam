import { apiFetch } from "@/lib/api";
import type { NormalizedSchedule, UpdateScheduleInput } from "@/lib/admin/schedule-types";

function normalizeSchedule(raw: unknown): NormalizedSchedule {
  const d = raw as Record<string, unknown>;
  const data = (d?.data ?? d) as Record<string, unknown>;
  return {
    schoolId: String(data.school_id ?? ""),
    timezone: String(data.timezone ?? "Africa/Addis_Ababa"),
    openDays: Array.isArray(data.open_days) ? (data.open_days as string[]) : ["MON", "TUE", "WED", "THU", "FRI"],
    openTime: String(data.open_time ?? "08:30"),
    closeTime: String(data.close_time ?? "16:30"),
    liveEnabled: Boolean(data.live_enabled ?? true),
    temporaryLivePaused: Boolean(data.temporary_live_paused ?? false),
    temporaryLivePauseReason:
      typeof data.temporary_live_pause_reason === "string"
        ? data.temporary_live_pause_reason
        : null,
    isOpenNow: Boolean(data.is_open_now ?? false),
    nextLiveAvailableAt:
      typeof data.next_live_available_at === "string" ? data.next_live_available_at : null,
    createdAt: typeof data.created_at === "string" ? data.created_at : null,
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

export async function getSchoolSchedule(schoolId: string): Promise<NormalizedSchedule> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/schedule`,
    { method: "GET" },
  );
  return normalizeSchedule(raw);
}

export async function updateSchoolSchedule(
  schoolId: string,
  input: UpdateScheduleInput,
): Promise<NormalizedSchedule> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/schedule`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return normalizeSchedule(raw);
}

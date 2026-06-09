export interface NormalizedSchedule {
  schoolId: string;
  timezone: string;
  openDays: string[];
  openTime: string;
  closeTime: string;
  liveEnabled: boolean;
  temporaryLivePaused: boolean;
  temporaryLivePauseReason: string | null;
  isOpenNow: boolean;
  nextLiveAvailableAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateScheduleInput {
  timezone: string;
  open_days: string[];
  open_time: string;
  close_time: string;
  live_enabled: boolean;
  temporary_live_paused: boolean;
  temporary_live_pause_reason: string | null;
}

export const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type DayAbbr = (typeof ALL_DAYS)[number];

export const DAY_LABELS: Record<DayAbbr, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export type CameraOperationalStatus =
  | "online"
  | "offline"
  | "stopped_by_schedule"
  | "no_recent_segment"
  | "error"
  | "disabled"
  | "unknown";

export type NormalizedSchool = {
  id: string;
  name: string;
  status?: string;
};

export type NormalizedCameraStatus = {
  id: string;
  name: string;
  schoolId?: string;
  schoolName?: string;
  classroomId?: string;
  classroomName?: string;
  status: CameraOperationalStatus;
  rawStatus?: string;
  desiredState?: string;
  scheduleReason?: string;
  defaultQuality?: string;
  lastSegmentAt?: string | null;
  streamLagSeconds?: number | null;
  lastSegmentAgeMinutes?: number | null;
  openAlerts?: number;
  lastHealthEvent?: string | null;
};

export type SchoolCameraStatusResponse = {
  schoolId: string;
  schoolName: string;
  cameras: NormalizedCameraStatus[];
};

export type CameraHealthEvent = {
  id?: string;
  eventType?: string;
  severity?: string;
  message?: string;
  createdAt?: string;
};

export type CameraHealthAlert = {
  id?: string;
  type?: string;
  severity?: string;
  status?: string;
  message?: string;
  createdAt?: string;
};

export type NormalizedCameraHealth = {
  id: string;
  name?: string;
  schoolName?: string;
  classroomName?: string;
  status: CameraOperationalStatus;
  rawStatus?: string;
  desiredState?: string;
  scheduleReason?: string;
  defaultQuality?: string;
  lastSegmentAt?: string | null;
  streamLagSeconds?: number | null;
  lastSegmentAgeMinutes?: number | null;
  openAlertsCount?: number;
  lastHealthEvent?: string | null;
  playlistExists?: boolean;
  events: CameraHealthEvent[];
  alerts: CameraHealthAlert[];
  lastWorkerHeartbeat?: string | null;
};

export type NormalizedSchedulerStatus = {
  timezone?: string;
  currentState?: string;
  reason?: string;
  recordingStartTime?: string;
  recordingEndTime?: string;
  recordingDays?: string[];
  nextStartAt?: string | null;
  nextStopAt?: string | null;
  camerasRunningDesired?: number;
  camerasStoppedDesired?: number;
};

export type CameraStatusSummary = {
  total: number;
  online: number;
  offline: number;
  stoppedBySchedule: number;
  noRecentSegment: number;
  error: number;
  disabled: number;
  openAlerts: number;
};

export type CameraStatusFilter =
  | "all"
  | "online"
  | "offline"
  | "stopped_by_schedule"
  | "no_recent_segment"
  | "error"
  | "disabled";

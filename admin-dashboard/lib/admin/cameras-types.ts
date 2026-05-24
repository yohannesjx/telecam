export type CameraStatus =
  | "ACTIVE"
  | "DISABLED"
  | "ONLINE"
  | "OFFLINE"
  | "ERROR"
  | "STOPPED"
  | "UNKNOWN";

export type CameraQuality = "low_240p" | "sd_360p" | "sd_480p";

export type NormalizedClassroom = {
  id: string;
  name: string;
};

export type NormalizedCamera = {
  id: string;
  name: string;
  schoolId?: string | null;
  schoolName?: string | null;
  classroomId?: string | null;
  classroomName?: string | null;
  status: CameraStatus;
  defaultQuality?: CameraQuality | string | null;
  desiredState?: string | null;
  scheduleReason?: string | null;
  lastSegmentAt?: string | null;
  openAlerts?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NormalizedCameraStreamState = {
  cameraId?: string;
  desiredState?: string | null;
  reason?: string | null;
  updatedAt?: string | null;
};

export type NormalizedCameraDetail = NormalizedCamera & {
  streamState?: NormalizedCameraStreamState | null;
};

export type CreateCameraInput = {
  classroom_id: string;
  name: string;
  rtsp_url: string;
  default_quality: CameraQuality;
};

export type UpdateCameraInput = {
  classroom_id?: string;
  name?: string;
  rtsp_url?: string;
  default_quality?: CameraQuality;
  status?: "ACTIVE" | "DISABLED";
};

export const CAMERA_QUALITY_OPTIONS: CameraQuality[] = [
  "low_240p",
  "sd_360p",
  "sd_480p",
];

export const CAMERA_STATUS_OPTIONS = ["ACTIVE", "DISABLED"] as const;

import { z } from "zod";

import type { CameraQuality } from "@/lib/admin/cameras-types";

export const CAMERA_QUALITY_VALUES = ["low_240p", "sd_360p", "sd_480p"] as const;

export function isPrivateOrTailscaleHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;

  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const parts = h.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  return false;
}

export function getRtspHostWarning(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "rtsp:") return null;
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "localhost/127.0.0.1 is usually not reachable from the server unless intentional.";
    }
    if (!isPrivateOrTailscaleHost(host)) {
      return "Public IP detected. For production, use Tailscale/private IP instead of public RTSP.";
    }
  } catch {
    return null;
  }
  return null;
}

const rtspUrlSchema = z
  .string()
  .trim()
  .min(1, "RTSP URL is required")
  .refine((v) => v.startsWith("rtsp://"), "RTSP URL must start with rtsp://")
  .refine((v) => !/\s/.test(v), "RTSP URL must not contain spaces")
  .refine((v) => {
    try {
      const u = new URL(v);
      return Boolean(u.hostname);
    } catch {
      return false;
    }
  }, "RTSP URL must include a valid host");

const optionalRtspUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || v.startsWith("rtsp://"), "RTSP URL must start with rtsp://")
  .refine((v) => !v || !/\s/.test(v), "RTSP URL must not contain spaces")
  .refine((v) => {
    if (!v) return true;
    try {
      return Boolean(new URL(v).hostname);
    } catch {
      return false;
    }
  }, "RTSP URL must include a valid host");

export const createCameraFormSchema = z.object({
  school_id: z.string().uuid("Select a school"),
  classroom_id: z.string().uuid("Select a classroom"),
  name: z.string().trim().min(1, "Camera name is required"),
  rtsp_url: rtspUrlSchema,
  default_quality: z.enum(CAMERA_QUALITY_VALUES),
});

export const editCameraFormSchema = z.object({
  classroom_id: z.string().uuid("Select a classroom"),
  name: z.string().trim().min(1, "Camera name is required"),
  rtsp_url: optionalRtspUrlSchema,
  default_quality: z.enum(CAMERA_QUALITY_VALUES),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export type CreateCameraFormValues = z.infer<typeof createCameraFormSchema>;
export type EditCameraFormValues = z.infer<typeof editCameraFormSchema>;

export function toCreateCameraInput(values: CreateCameraFormValues) {
  return {
    classroom_id: values.classroom_id,
    name: values.name,
    rtsp_url: values.rtsp_url,
    default_quality: values.default_quality as CameraQuality,
  };
}

export function toUpdateCameraInput(values: EditCameraFormValues) {
  const input: {
    classroom_id?: string;
    name?: string;
    rtsp_url?: string;
    default_quality?: CameraQuality;
    status?: "ACTIVE" | "DISABLED";
  } = {
    classroom_id: values.classroom_id,
    name: values.name,
    default_quality: values.default_quality as CameraQuality,
    status: values.status,
  };
  if (values.rtsp_url && values.rtsp_url.trim()) {
    input.rtsp_url = values.rtsp_url.trim();
  }
  return input;
}

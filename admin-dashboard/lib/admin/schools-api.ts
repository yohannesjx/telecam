import { ApiError, apiFetch } from "@/lib/api";
import {
  buildSchoolApiBody,
  formValuesToCreateInput,
  type SchoolFormValues,
} from "@/lib/school-form";
import {
  normalizeChildren,
  normalizeClassrooms,
  normalizeRevenueShare,
  normalizeSchoolAdmins,
  normalizeSchoolDetail,
  normalizeSchools,
  normalizeStorageUsage,
} from "@/lib/admin/schools-normalizer";
import type {
  AssignSchoolAdminInput,
  NormalizedChildSummary,
  NormalizedClassroomSummary,
  NormalizedRevenueShare,
  NormalizedSchool,
  NormalizedSchoolAdmin,
  NormalizedSchoolDetail,
  NormalizedStorageUsageRow,
  SetRevenueShareInput,
  UpdateSchoolInput,
} from "@/lib/admin/schools-types";
import { encodeSchoolAddress } from "@/lib/admin/schools-normalizer";

function buildAddressFromInput(input: {
  timezone: string;
  city?: string;
  address?: string;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
}): string {
  return encodeSchoolAddress({
    timezone: input.timezone,
    city: input.city,
    contactName: input.contact_name,
    contactEmail: input.contact_email,
    notes: input.notes,
    streetAddress: input.address,
  });
}

export async function getSchools(): Promise<NormalizedSchool[]> {
  const raw = await apiFetch<unknown>("/admin/schools", { method: "GET" });
  return normalizeSchools(raw);
}

export async function getSchool(id: string): Promise<NormalizedSchoolDetail> {
  const raw = await apiFetch<unknown>(`/admin/schools/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return normalizeSchoolDetail(raw);
}

export async function createSchoolFromForm(values: SchoolFormValues): Promise<NormalizedSchoolDetail> {
  const input = formValuesToCreateInput(values);
  const raw = await apiFetch<unknown>("/admin/schools", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      address: buildAddressFromInput(input),
      phone: input.contact_phone ?? "",
    }),
  });
  return normalizeSchoolDetail(raw);
}

export async function updateSchoolFromForm(
  id: string,
  values: SchoolFormValues,
  canSetStatus: boolean,
): Promise<NormalizedSchoolDetail> {
  const body = buildSchoolApiBody(values, { includeStatus: canSetStatus });
  const raw = await apiFetch<unknown>(`/admin/schools/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return normalizeSchoolDetail(raw);
}

export async function updateSchoolLimited(
  id: string,
  input: UpdateSchoolInput,
): Promise<NormalizedSchoolDetail> {
  const body: Record<string, string> = {};
  if (input.contact_phone !== undefined) body.phone = input.contact_phone;
  if (
    input.timezone ||
    input.city ||
    input.address ||
    input.contact_name ||
    input.contact_email ||
    input.notes
  ) {
    body.address = buildAddressFromInput({
      timezone: input.timezone ?? "Africa/Addis_Ababa",
      city: input.city,
      address: input.address,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      notes: input.notes,
    });
  }
  const raw = await apiFetch<unknown>(`/admin/schools/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return normalizeSchoolDetail(raw);
}

export async function getSchoolAdmins(id: string): Promise<NormalizedSchoolAdmin[]> {
  const raw = await apiFetch<unknown>(`/admin/schools/${encodeURIComponent(id)}/admins`, {
    method: "GET",
  });
  return normalizeSchoolAdmins(raw);
}

export async function assignSchoolAdmin(
  id: string,
  input: AssignSchoolAdminInput,
): Promise<void> {
  await apiFetch<unknown>(`/admin/schools/${encodeURIComponent(id)}/admins`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getSchoolRevenueShare(id: string): Promise<NormalizedRevenueShare | null> {
  try {
    const raw = await apiFetch<unknown>(
      `/admin/schools/${encodeURIComponent(id)}/revenue-share`,
      { method: "GET" },
    );
    return normalizeRevenueShare(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function setSchoolRevenueShare(
  id: string,
  input: SetRevenueShareInput,
): Promise<NormalizedRevenueShare> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(id)}/revenue-share`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return normalizeRevenueShare(raw) ?? {
    schoolSharePercent: input.percentage,
    platformSharePercent: 100 - input.percentage,
    effectiveFrom: input.active_from,
  };
}

export async function getSchoolClassrooms(schoolId: string): Promise<NormalizedClassroomSummary[]> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/classrooms`,
    { method: "GET" },
  );
  return normalizeClassrooms(raw);
}

export async function getSchoolChildren(schoolId: string): Promise<NormalizedChildSummary[]> {
  const raw = await apiFetch<unknown>(
    `/admin/schools/${encodeURIComponent(schoolId)}/children`,
    { method: "GET" },
  );
  return normalizeChildren(raw);
}

export async function getSchoolStorageUsage(
  schoolId: string,
): Promise<NormalizedStorageUsageRow[]> {
  const raw = await apiFetch<unknown>(
    `/admin/storage-usage?school_id=${encodeURIComponent(schoolId)}`,
    { method: "GET" },
  );
  return normalizeStorageUsage(raw);
}

export {
  ACTION_FORBIDDEN_MESSAGE,
  FORBIDDEN_MESSAGE,
  isForbiddenError,
} from "@/lib/auth/forbidden";

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignSchoolAdmin,
  createSchoolFromForm,
  getSchool,
  getSchoolAdmins,
  getSchoolRevenueShare,
  getSchoolStorageUsage,
  getSchools,
  setSchoolRevenueShare,
  updateSchoolFromForm,
  updateSchoolLimited,
} from "@/lib/admin/schools-api";
import type { AssignSchoolAdminInput, SetRevenueShareInput } from "@/lib/admin/schools-types";
import type { SchoolFormValues } from "@/lib/school-form";
import type { UserRole } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";

export const SCHOOLS_LIST_KEY = ["admin", "schools-list"] as const;
export const SCHOOL_DETAIL_KEY = ["admin", "school-detail"] as const;
export const SCHOOL_ADMINS_KEY = ["admin", "school-admins"] as const;
export const SCHOOL_REVENUE_KEY = ["admin", "school-revenue"] as const;
export const SCHOOL_STORAGE_KEY = ["admin", "school-storage"] as const;

export {
  useSchoolClassroomsQuery,
  SCHOOL_CLASSROOMS_KEY,
} from "@/lib/admin/use-classrooms-queries";
export {
  useSchoolChildrenQuery,
  SCHOOL_CHILDREN_KEY,
} from "@/lib/admin/use-children-queries";

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function canCreateSchool(role: UserRole | undefined): boolean {
  return hasPermission(role, "schools:create");
}

export function canAssignSchoolAdmins(role: UserRole | undefined): boolean {
  return hasPermission(role, "schoolAdmins:manage");
}

export function canSetRevenueShare(role: UserRole | undefined): boolean {
  return hasPermission(role, "revenueShare:manage");
}

export function canViewRevenueShare(role: UserRole | undefined): boolean {
  return hasPermission(role, "revenueShare:view");
}

export function canEditSchoolFull(role: UserRole | undefined): boolean {
  return hasPermission(role, "schools:update") && role === "SUPER_ADMIN";
}

export function canEditSchool(role: UserRole | undefined): boolean {
  return hasPermission(role, "schools:update");
}

export function useSchoolsListQuery() {
  return useQuery({
    queryKey: SCHOOLS_LIST_KEY,
    queryFn: getSchools,
    staleTime: 60_000,
  });
}

export function useSchoolDetailQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...SCHOOL_DETAIL_KEY, schoolId],
    queryFn: () => getSchool(schoolId!),
    enabled: Boolean(schoolId),
  });
}

export function useSchoolAdminsQuery(schoolId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...SCHOOL_ADMINS_KEY, schoolId],
    queryFn: () => getSchoolAdmins(schoolId!),
    enabled: Boolean(schoolId) && enabled,
    retry: (count, err) => {
      if (typeof err === "object" && err && "status" in err && (err as { status: number }).status === 403) {
        return false;
      }
      return count < 1;
    },
  });
}

export function useSchoolRevenueShareQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...SCHOOL_REVENUE_KEY, schoolId],
    queryFn: () => getSchoolRevenueShare(schoolId!),
    enabled: Boolean(schoolId),
    retry: false,
  });
}

export function useSchoolStorageQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...SCHOOL_STORAGE_KEY, schoolId],
    queryFn: () => getSchoolStorageUsage(schoolId!),
    enabled: Boolean(schoolId),
    retry: 1,
  });
}

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SchoolFormValues) => createSchoolFromForm(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SCHOOLS_LIST_KEY });
    },
  });
}

export function useUpdateSchoolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      schoolId,
      values,
      canSetStatus,
      limited,
    }: {
      schoolId: string;
      values: SchoolFormValues;
      canSetStatus: boolean;
      limited: boolean;
    }) =>
      limited
        ? updateSchoolLimited(schoolId, {
            timezone: values.timezone,
            city: values.city,
            address: values.address,
            contact_name: values.contact_name,
            contact_phone: values.contact_phone,
            contact_email: values.contact_email,
            notes: values.notes,
          })
        : updateSchoolFromForm(schoolId, values, canSetStatus),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SCHOOLS_LIST_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_DETAIL_KEY, variables.schoolId],
      });
    },
  });
}

export function useAssignSchoolAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, input }: { schoolId: string; input: AssignSchoolAdminInput }) =>
      assignSchoolAdmin(schoolId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_ADMINS_KEY, variables.schoolId],
      });
    },
  });
}

export function useSetRevenueShareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, input }: { schoolId: string; input: SetRevenueShareInput }) =>
      setSchoolRevenueShare(schoolId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_REVENUE_KEY, variables.schoolId],
      });
    },
  });
}

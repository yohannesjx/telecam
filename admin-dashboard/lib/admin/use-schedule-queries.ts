"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSchoolSchedule, updateSchoolSchedule } from "@/lib/admin/schedule-api";
import type { UpdateScheduleInput } from "@/lib/admin/schedule-types";
import type { UserRole } from "@/lib/auth/types";

export const SCHOOL_SCHEDULE_KEY = ["admin", "school-schedule"] as const;

export function canUpdateSchedule(role: UserRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function useSchoolScheduleQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...SCHOOL_SCHEDULE_KEY, schoolId],
    queryFn: () => getSchoolSchedule(schoolId!),
    enabled: Boolean(schoolId),
    staleTime: 30_000,
  });
}

export function useUpdateScheduleMutation(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateScheduleInput) => updateSchoolSchedule(schoolId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_SCHEDULE_KEY, schoolId],
      });
    },
  });
}

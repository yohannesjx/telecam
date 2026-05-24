"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createClassroom,
  getSchoolClassrooms,
  updateClassroom,
} from "@/lib/admin/classrooms-api";
import type {
  CreateClassroomInput,
  UpdateClassroomInput,
} from "@/lib/admin/classrooms-types";
import type { UserRole } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";

export const SCHOOL_CLASSROOMS_KEY = ["admin", "school-classrooms"] as const;
export const SCHOOL_CHILDREN_KEY = ["admin", "school-children"] as const;

export function canManageSchoolStructure(role: UserRole | undefined): boolean {
  return hasAnyStructurePermission(role);
}

export function canManageClassrooms(role: UserRole | undefined): boolean {
  return hasPermission(role, "classrooms:create");
}

export function canManageChildren(role: UserRole | undefined): boolean {
  return hasPermission(role, "children:create");
}

export function canManageParents(role: UserRole | undefined): boolean {
  return hasPermission(role, "parents:create");
}

function hasAnyStructurePermission(role: UserRole | undefined): boolean {
  return (
    hasPermission(role, "classrooms:create") ||
    hasPermission(role, "children:create") ||
    hasPermission(role, "parents:create")
  );
}

export function useSchoolClassroomsQuery(schoolId: string | null) {
  return useQuery({
    queryKey: [...SCHOOL_CLASSROOMS_KEY, schoolId],
    queryFn: () => getSchoolClassrooms(schoolId!),
    enabled: Boolean(schoolId),
    staleTime: 30_000,
  });
}

export function useCreateClassroomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      schoolId,
      input,
    }: {
      schoolId: string;
      input: CreateClassroomInput;
    }) => createClassroom(schoolId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CLASSROOMS_KEY, variables.schoolId],
      });
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CHILDREN_KEY, variables.schoolId],
      });
    },
  });
}

export function useUpdateClassroomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      classroomId,
      schoolId,
      input,
    }: {
      classroomId: string;
      schoolId: string;
      input: UpdateClassroomInput;
    }) => updateClassroom(classroomId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CLASSROOMS_KEY, variables.schoolId],
      });
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CHILDREN_KEY, variables.schoolId],
      });
    },
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createChild,
  getSchoolChildren,
  updateChild,
} from "@/lib/admin/children-api";
import type { CreateChildInput, UpdateChildInput } from "@/lib/admin/children-types";
import {
  SCHOOL_CLASSROOMS_KEY,
  SCHOOL_CHILDREN_KEY,
} from "@/lib/admin/use-classrooms-queries";

export { SCHOOL_CHILDREN_KEY };

export function useSchoolChildrenQuery(
  schoolId: string | null,
  classroomId?: string | null,
) {
  return useQuery({
    queryKey: [...SCHOOL_CHILDREN_KEY, schoolId, classroomId ?? "all"],
    queryFn: () => getSchoolChildren(schoolId!, classroomId ?? undefined),
    enabled: Boolean(schoolId),
    staleTime: 30_000,
  });
}

export function useCreateChildMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, input }: { schoolId: string; input: CreateChildInput }) =>
      createChild(schoolId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CHILDREN_KEY, variables.schoolId],
      });
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CLASSROOMS_KEY, variables.schoolId],
      });
    },
  });
}

export function useUpdateChildMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      childId,
      schoolId,
      input,
    }: {
      childId: string;
      schoolId: string;
      input: UpdateChildInput;
    }) => updateChild(childId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CHILDREN_KEY, variables.schoolId],
      });
      await queryClient.invalidateQueries({
        queryKey: [...SCHOOL_CLASSROOMS_KEY, variables.schoolId],
      });
    },
  });
}

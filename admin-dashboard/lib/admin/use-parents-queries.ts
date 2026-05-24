"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createParent,
  getChildParents,
  getParentById,
  getParents,
  linkParentToChild,
} from "@/lib/admin/parents-api";
import type {
  CreateParentInput,
  LinkParentToChildInput,
} from "@/lib/admin/parents-types";
import { SCHOOL_CHILDREN_KEY } from "@/lib/admin/use-children-queries";

export const PARENTS_QUERY_KEY = ["admin", "parents"] as const;
export const PARENT_DETAIL_QUERY_KEY = ["admin", "parent-detail"] as const;
export const CHILD_PARENTS_QUERY_KEY = ["admin", "child-parents"] as const;

export function useParentsQuery() {
  return useQuery({
    queryKey: PARENTS_QUERY_KEY,
    queryFn: getParents,
    staleTime: 20_000,
  });
}

export function useParentDetailQuery(parentId: string | null) {
  return useQuery({
    queryKey: [...PARENT_DETAIL_QUERY_KEY, parentId],
    queryFn: () => getParentById(parentId!),
    enabled: Boolean(parentId),
  });
}

export function useChildParentsQuery(childId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...CHILD_PARENTS_QUERY_KEY, childId],
    queryFn: () => getChildParents(childId!),
    enabled: Boolean(childId) && enabled,
    retry: 1,
  });
}

export function useCreateParentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParentInput) => createParent(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PARENTS_QUERY_KEY });
    },
  });
}

export function useLinkParentToChildMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, input }: { childId: string; input: LinkParentToChildInput }) =>
      linkParentToChild(childId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: PARENTS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...CHILD_PARENTS_QUERY_KEY, variables.childId],
      });
      await queryClient.invalidateQueries({ queryKey: SCHOOL_CHILDREN_KEY });
    },
  });
}

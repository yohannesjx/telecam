"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  generateParentInvitationCode,
  listParentInvitationCodes,
  revokeParentInvitationCode,
} from "@/lib/admin/parent-codes-api";

export const PARENT_CODES_QUERY_KEY = ["admin", "parent-invitation-codes"] as const;

export function useParentInvitationCodesQuery(parentId: string | null) {
  return useQuery({
    queryKey: [...PARENT_CODES_QUERY_KEY, parentId],
    queryFn: () => listParentInvitationCodes(parentId!),
    enabled: Boolean(parentId),
    staleTime: 15_000,
  });
}

export function useGenerateParentInvitationCodeMutation(parentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId }: { schoolId: string }) =>
      generateParentInvitationCode(parentId, schoolId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...PARENT_CODES_QUERY_KEY, parentId],
      });
    },
  });
}

export function useRevokeParentInvitationCodeMutation(parentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ codeId }: { codeId: string }) =>
      revokeParentInvitationCode(parentId, codeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...PARENT_CODES_QUERY_KEY, parentId],
      });
    },
  });
}

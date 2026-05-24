"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignUserSchools,
  createUser,
  forceUserPasswordChange,
  getUserById,
  getUsers,
  resetUserPassword,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from "@/lib/admin/users-api";
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UserListFilters,
} from "@/lib/admin/users-types";

export const USERS_QUERY_KEY = ["admin", "users"] as const;
export const USER_DETAIL_QUERY_KEY = ["admin", "user-detail"] as const;

export function useUsersQuery(filters?: UserListFilters) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, filters ?? {}],
    queryFn: () => getUsers(filters),
    staleTime: 20_000,
  });
}

export function useUserDetailQuery(userId: string | null) {
  return useQuery({
    queryKey: [...USER_DETAIL_QUERY_KEY, userId],
    queryFn: () => getUserById(userId!),
    enabled: Boolean(userId),
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) =>
      updateUser(userId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...USER_DETAIL_QUERY_KEY, variables.userId],
      });
    },
  });
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      updateUserStatus(userId, status),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...USER_DETAIL_QUERY_KEY, variables.userId],
      });
    },
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...USER_DETAIL_QUERY_KEY, variables.userId],
      });
    },
  });
}

export function useResetUserPasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: ResetPasswordInput }) =>
      resetUserPassword(userId, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...USER_DETAIL_QUERY_KEY, variables.userId],
      });
    },
  });
}

export function useForcePasswordChangeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, force }: { userId: string; force: boolean }) =>
      forceUserPasswordChange(userId, force),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...USER_DETAIL_QUERY_KEY, variables.userId],
      });
    },
  });
}

export function useAssignUserSchoolsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, schoolIds }: { userId: string; schoolIds: string[] }) =>
      assignUserSchools(userId, schoolIds),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...USER_DETAIL_QUERY_KEY, variables.userId],
      });
    },
  });
}

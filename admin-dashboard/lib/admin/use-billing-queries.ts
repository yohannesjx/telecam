"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approvePayment,
  createInvoice,
  createPayment,
  createSubscription,
  extendSubscription,
  getInvoices,
  getPayments,
  getSubscriptions,
  markInvoicePaid,
  rejectPayment,
  updateSubscriptionStatus,
  voidInvoice,
} from "@/lib/admin/billing-api";
import type {
  ApprovePaymentInput,
  BillingFilters,
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
  ExtendSubscriptionInput,
  RejectPaymentInput,
  UpdateSubscriptionStatusInput,
} from "@/lib/admin/billing-types";
import type { UserRole } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";

export const SUBSCRIPTIONS_QUERY_KEY = ["admin", "subscriptions"] as const;
export const PAYMENTS_QUERY_KEY = ["admin", "payments"] as const;
export const INVOICES_QUERY_KEY = ["admin", "invoices"] as const;

export function canManageBilling(role: UserRole | undefined): boolean {
  return hasPermission(role, "billing:manage");
}

export function canViewBilling(role: UserRole | undefined): boolean {
  return hasPermission(role, "billing:view");
}

function subscriptionFiltersKey(params?: BillingFilters) {
  return [...SUBSCRIPTIONS_QUERY_KEY, params ?? {}] as const;
}

function paymentFiltersKey(params?: BillingFilters) {
  return [...PAYMENTS_QUERY_KEY, params ?? {}] as const;
}

function invoiceFiltersKey(params?: BillingFilters) {
  return [...INVOICES_QUERY_KEY, params ?? {}] as const;
}

export function useSubscriptionsQuery(params?: BillingFilters) {
  return useQuery({
    queryKey: subscriptionFiltersKey(params),
    queryFn: () => getSubscriptions(params),
    staleTime: 20_000,
  });
}

export function usePaymentsQuery(params?: BillingFilters) {
  return useQuery({
    queryKey: paymentFiltersKey(params),
    queryFn: () => getPayments(params),
    staleTime: 20_000,
  });
}

export function useInvoicesQuery(params?: BillingFilters) {
  return useQuery({
    queryKey: invoiceFiltersKey(params),
    queryFn: () => getInvoices(params),
    staleTime: 20_000,
  });
}

async function invalidateAllBilling(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  ]);
}

export function useCreateSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) => createSubscription(input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useUpdateSubscriptionStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubscriptionStatusInput }) =>
      updateSubscriptionStatus(id, input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useExtendSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExtendSubscriptionInput }) =>
      extendSubscription(id, input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => createPayment(input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useApprovePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ApprovePaymentInput }) =>
      approvePayment(id, input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useRejectPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RejectPaymentInput }) =>
      rejectPayment(id, input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(input),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useMarkInvoicePaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markInvoicePaid(id),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

export function useVoidInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => voidInvoice(id),
    onSuccess: async () => {
      await invalidateAllBilling(queryClient);
    },
  });
}

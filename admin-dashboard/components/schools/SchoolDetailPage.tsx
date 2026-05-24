"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";

import { SchoolAlertsTab } from "@/components/schools/SchoolAlertsTab";
import { SchoolBillingTab } from "@/components/schools/SchoolBillingTab";
import { SchoolBreadcrumbs } from "@/components/schools/SchoolBreadcrumbs";
import { SchoolCamerasTab } from "@/components/schools/SchoolCamerasTab";
import { SchoolChildrenTab } from "@/components/schools/SchoolChildrenTab";
import { SchoolClassroomsTab } from "@/components/schools/SchoolClassroomsTab";
import { SchoolOverviewTab } from "@/components/schools/SchoolOverviewTab";
import { SchoolParentsTab } from "@/components/schools/SchoolParentsTab";
import { SchoolStatusBadge } from "@/components/schools/SchoolStatusBadge";
import { SchoolStorageTab } from "@/components/schools/SchoolStorageTab";
import { SchoolsError } from "@/components/schools/SchoolsError";
import { SchoolsSkeleton } from "@/components/schools/SchoolsSkeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  canAssignSchoolAdmins,
  canEditSchool,
  canSetRevenueShare,
  canViewRevenueShare,
  useSchoolDetailQuery,
} from "@/lib/admin/use-schools-queries";
import { canCreateCamera } from "@/lib/admin/use-cameras-queries";
import { useAuth } from "@/lib/auth/auth-context";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import { formatTimeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "classrooms", label: "Classrooms" },
  { id: "children", label: "Children" },
  { id: "parents", label: "Parents" },
  { id: "cameras", label: "Cameras" },
  { id: "billing", label: "Billing" },
  { id: "alerts", label: "Alerts" },
  { id: "storage", label: "Storage" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_PERMISSIONS: Record<TabId, Permission> = {
  overview: "schools:view",
  classrooms: "classrooms:view",
  children: "children:view",
  parents: "parents:view",
  cameras: "cameras:view",
  billing: "billing:view",
  alerts: "alerts:view",
  storage: "billing:view",
};

export function SchoolDetailPage({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const tabParam = searchParams.get("tab") as TabId | null;
  const classroomIdParam = searchParams.get("classroomId") ?? "";

  const [tab, setTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "overview",
  );
  const [childrenClassroomFilter, setChildrenClassroomFilter] = useState(classroomIdParam);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    setChildrenClassroomFilter(classroomIdParam);
  }, [classroomIdParam]);

  const setTabWithQuery = (nextTab: TabId, classroomId?: string) => {
    setTab(nextTab);
    const params = new URLSearchParams();
    if (nextTab !== "overview") params.set("tab", nextTab);
    if (classroomId) params.set("classroomId", classroomId);
    const query = params.toString();
    router.replace(`/schools/${schoolId}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const schoolQuery = useSchoolDetailQuery(schoolId);
  const canEdit = canEditSchool(user?.role);
  const canAddCamera = canCreateCamera(user?.role);

  const visibleTabs = useMemo(
    () => TABS.filter((item) => hasPermission(user?.role, TAB_PERMISSIONS[item.id])),
    [user?.role],
  );

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0].id);
    }
  }, [visibleTabs, tab]);

  if (schoolQuery.isLoading) return <SchoolsSkeleton />;
  if (schoolQuery.isError || !schoolQuery.data) {
    return (
      <SchoolsError
        message="Could not load school."
        onRetry={() => void schoolQuery.refetch()}
        isRetrying={schoolQuery.isFetching}
      />
    );
  }

  const school = schoolQuery.data;
  const lastUpdated = schoolQuery.dataUpdatedAt
    ? formatTimeOnly(new Date(schoolQuery.dataUpdatedAt))
    : "—";

  return (
    <div className="space-y-6">
      <SchoolBreadcrumbs
        items={[
          { label: "Schools", href: "/schools" },
          { label: school.name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{school.name}</h1>
            <SchoolStatusBadge status={school.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {school.city ?? school.address ?? "No location"} · {school.timezone ?? "No timezone"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Last updated: {lastUpdated}</span>
          <Button variant="outline" onClick={() => void schoolQuery.refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${schoolQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canEdit ? (
            <Link
              href={`/schools/${school.id}/edit`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Edit
            </Link>
          ) : null}
          {canAddCamera ? (
            <Link
              href={`/schools/${school.id}/cameras`}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create camera
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {visibleTabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tab === item.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setTabWithQuery(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "overview" ? (
        <SchoolOverviewTab
          school={school}
          canAssignAdmins={canAssignSchoolAdmins(user?.role)}
          canSetRevenueShare={canSetRevenueShare(user?.role)}
          canViewRevenueShare={canViewRevenueShare(user?.role)}
        />
      ) : null}
      {tab === "classrooms" ? (
        <SchoolClassroomsTab
          schoolId={school.id}
          onViewChildren={(classroomId) => {
            setChildrenClassroomFilter(classroomId);
            setTabWithQuery("children", classroomId);
          }}
          onViewCameras={() => setTabWithQuery("cameras")}
        />
      ) : null}
      {tab === "children" ? (
        <SchoolChildrenTab
          schoolId={school.id}
          initialClassroomId={childrenClassroomFilter}
        />
      ) : null}
      {tab === "parents" ? <SchoolParentsTab /> : null}
      {tab === "cameras" ? (
        <SchoolCamerasTab schoolId={school.id} schoolName={school.name} />
      ) : null}
      {tab === "billing" ? (
        <SchoolBillingTab
          schoolId={school.id}
          canSetRevenueShare={canSetRevenueShare(user?.role)}
        />
      ) : null}
      {tab === "alerts" ? <SchoolAlertsTab schoolId={school.id} /> : null}
      {tab === "storage" ? <SchoolStorageTab schoolId={school.id} /> : null}
    </div>
  );
}

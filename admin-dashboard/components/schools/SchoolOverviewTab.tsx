"use client";

import { useMemo } from "react";

import { RevenueShareSection } from "@/components/schools/RevenueShareSection";
import { SchoolAdminsSection } from "@/components/schools/SchoolAdminsSection";
import { SchoolStatusBadge } from "@/components/schools/SchoolStatusBadge";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NormalizedSchoolDetail } from "@/lib/admin/schools-types";
import { useAlertsQuery } from "@/lib/admin/use-alerts-queries";
import { useSchoolCamerasQuery } from "@/lib/admin/use-cameras-queries";
import {
  useSchoolChildrenQuery,
  useSchoolClassroomsQuery,
  useSchoolRevenueShareQuery,
  useSchoolStorageQuery,
} from "@/lib/admin/use-schools-queries";
import { formatDateTime, formatNumber, formatStorage } from "@/lib/format";
import { Building2, Camera, GraduationCap, Users } from "lucide-react";

type SchoolOverviewTabProps = {
  school: NormalizedSchoolDetail;
  canAssignAdmins: boolean;
  canSetRevenueShare: boolean;
  canViewRevenueShare: boolean;
};

export function SchoolOverviewTab({
  school,
  canAssignAdmins,
  canSetRevenueShare,
  canViewRevenueShare,
}: SchoolOverviewTabProps) {
  const classroomsQuery = useSchoolClassroomsQuery(school.id);
  const childrenQuery = useSchoolChildrenQuery(school.id);
  const camerasQuery = useSchoolCamerasQuery(school.id);
  const storageQuery = useSchoolStorageQuery(school.id);
  const revenueQuery = useSchoolRevenueShareQuery(school.id);
  const alertsQuery = useAlertsQuery({ limit: 200 });

  const openAlerts = useMemo(
    () =>
      (alertsQuery.data?.alerts ?? []).filter(
        (a) => a.schoolId === school.id && a.status === "open",
      ).length,
    [alertsQuery.data?.alerts, school.id],
  );

  const classroomsCount = classroomsQuery.data?.length ?? school.classroomsCount;
  const childrenCount = childrenQuery.data?.length ?? school.childrenCount;
  const camerasCount = camerasQuery.data?.length ?? school.camerasCount;
  const latestStorage = storageQuery.data?.[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard label="Classrooms" value={formatNumber(classroomsCount)} icon={Building2} />
        <DashboardMetricCard label="Children" value={formatNumber(childrenCount)} icon={GraduationCap} />
        <DashboardMetricCard label="Cameras" value={formatNumber(camerasCount)} icon={Camera} />
        <DashboardMetricCard label="Open alerts" value={formatNumber(openAlerts)} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School summary</CardTitle>
          <CardDescription>Core configuration and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <SchoolStatusBadge status={school.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Timezone</dt>
              <dd className="text-sm font-medium">{school.timezone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Location</dt>
              <dd className="text-sm font-medium">
                {[school.city, school.address].filter(Boolean).join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contact person</dt>
              <dd className="text-sm font-medium">{school.contactName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contact email</dt>
              <dd className="text-sm font-medium">{school.contactEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contact phone</dt>
              <dd className="text-sm font-medium">{school.contactPhone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created at</dt>
              <dd className="text-sm font-medium">{formatDateTime(school.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Storage usage</dt>
              <dd className="text-sm font-medium">
                {latestStorage
                  ? formatStorage(latestStorage.totalGb, latestStorage.totalBytes)
                  : "—"}
              </dd>
            </div>
            {canViewRevenueShare ? (
              <div>
                <dt className="text-xs text-muted-foreground">Revenue share</dt>
                <dd className="text-sm font-medium">
                  {revenueQuery.data?.schoolSharePercent != null
                    ? `${revenueQuery.data.schoolSharePercent}% school / ${revenueQuery.data.platformSharePercent}% platform`
                    : "—"}
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <SchoolAdminsSection
        schoolId={school.id}
        canAssign={canAssignAdmins}
        canList={canAssignAdmins}
      />

      {canSetRevenueShare ? (
        <RevenueShareSection schoolId={school.id} canEdit={canSetRevenueShare} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Activity feed coming in a later phase</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Audit and activity timeline will appear here in a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

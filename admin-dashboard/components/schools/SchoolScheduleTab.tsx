"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Clock, AlertTriangle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolScheduleQuery, useUpdateScheduleMutation, canUpdateSchedule } from "@/lib/admin/use-schedule-queries";
import type { NormalizedSchedule } from "@/lib/admin/schedule-types";
import { ALL_DAYS, DAY_LABELS } from "@/lib/admin/schedule-types";
import type { UpdateScheduleInput } from "@/lib/admin/schedule-types";
import { useAuth } from "@/lib/auth/auth-context";

type Props = { schoolId: string };

function StatusBadge({ schedule }: { schedule: NormalizedSchedule }) {
  if (!schedule.liveEnabled) {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Disabled</span>;
  }
  if (schedule.temporaryLivePaused) {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Paused</span>;
  }
  if (schedule.isOpenNow) {
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Open now</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">Closed now</span>;
}

function formatNextAvailable(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SchoolScheduleTab({ schoolId }: Props) {
  const { user } = useAuth();
  const canUpdate = canUpdateSchedule(user?.role);
  const query = useSchoolScheduleQuery(schoolId);
  const mutation = useUpdateScheduleMutation(schoolId);

  const schedule = query.data;

  const [timezone, setTimezone] = useState("Africa/Addis_Ababa");
  const [openDays, setOpenDays] = useState<string[]>(["MON", "TUE", "WED", "THU", "FRI"]);
  const [openTime, setOpenTime] = useState("08:30");
  const [closeTime, setCloseTime] = useState("16:30");
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [tempPaused, setTempPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!schedule) return;
    setTimezone(schedule.timezone);
    setOpenDays(schedule.openDays);
    setOpenTime(schedule.openTime);
    setCloseTime(schedule.closeTime);
    setLiveEnabled(schedule.liveEnabled);
    setTempPaused(schedule.temporaryLivePaused);
    setPauseReason(schedule.temporaryLivePauseReason ?? "");
    setDirty(false);
  }, [schedule]);

  function toggleDay(day: string) {
    setOpenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
    setDirty(true);
  }

  function applyTestingPreset() {
    setOpenDays([...ALL_DAYS]);
    setOpenTime("00:00");
    setCloseTime("23:59");
    setLiveEnabled(true);
    setTempPaused(false);
    setPauseReason("");
    setDirty(true);
  }

  async function handleSave() {
    setSaveError(null);
    const input: UpdateScheduleInput = {
      timezone,
      open_days: openDays,
      open_time: openTime,
      close_time: closeTime,
      live_enabled: liveEnabled,
      temporary_live_paused: tempPaused,
      temporary_live_pause_reason: pauseReason.trim() || null,
    };
    try {
      await mutation.mutateAsync(input);
      setDirty(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save. Please try again.";
      setSaveError(msg);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Loading schedule…</span>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Failed to load school schedule.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Current status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {schedule && <StatusBadge schedule={schedule} />}
            {schedule?.nextLiveAvailableAt && !schedule.isOpenNow && (
              <span className="text-sm text-muted-foreground">
                Next live: {formatNextAvailable(schedule.nextLiveAvailableAt)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${query.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule settings form */}
      <Card>
        <CardHeader>
          <CardTitle>School hours</CardTitle>
          <CardDescription>
            Configure when live streaming is available for parents.
            {!canUpdate && " Only Super Admins can edit these settings."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {saveError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {saveError}
            </div>
          )}

          {/* Timezone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sched-timezone">
              Timezone
            </label>
            <input
              id="sched-timezone"
              type="text"
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              value={timezone}
              onChange={(e) => { setTimezone(e.target.value); setDirty(true); }}
              disabled={!canUpdate}
              placeholder="Africa/Addis_Ababa"
            />
            <p className="text-xs text-muted-foreground">IANA timezone, e.g. Africa/Addis_Ababa</p>
          </div>

          {/* Open days */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Open days</span>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <label
                  key={day}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    openDays.includes(day)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  } ${!canUpdate ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={openDays.includes(day)}
                    onChange={() => canUpdate && toggleDay(day)}
                    disabled={!canUpdate}
                  />
                  {DAY_LABELS[day]}
                </label>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="sched-open-time">
                Opening time
              </label>
              <input
                id="sched-open-time"
                type="time"
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={openTime}
                onChange={(e) => { setOpenTime(e.target.value); setDirty(true); }}
                disabled={!canUpdate}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="sched-close-time">
                Closing time
              </label>
              <input
                id="sched-close-time"
                type="time"
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={closeTime}
                onChange={(e) => { setCloseTime(e.target.value); setDirty(true); }}
                disabled={!canUpdate}
              />
            </div>
          </div>

          {/* Live enabled toggle */}
          <div className="flex items-center gap-3">
            <input
              id="sched-live-enabled"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={liveEnabled}
              onChange={(e) => { setLiveEnabled(e.target.checked); setDirty(true); }}
              disabled={!canUpdate}
            />
            <label htmlFor="sched-live-enabled" className="text-sm font-medium cursor-pointer">
              Live streaming enabled
            </label>
          </div>
          {!liveEnabled && (
            <p className="text-xs text-muted-foreground -mt-2 ml-7">
              Live streaming is completely disabled. Parents will see a &ldquo;disabled&rdquo; message.
            </p>
          )}

          {/* Temporary pause toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                id="sched-temp-paused"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={tempPaused}
                onChange={(e) => { setTempPaused(e.target.checked); setDirty(true); }}
                disabled={!canUpdate}
              />
              <label htmlFor="sched-temp-paused" className="text-sm font-medium cursor-pointer">
                Temporarily pause live streaming
              </label>
            </div>
            {tempPaused && (
              <div className="ml-7 space-y-1.5">
                <label className="text-sm text-muted-foreground" htmlFor="sched-pause-reason">
                  Pause reason (shown to parents, optional)
                </label>
                <textarea
                  id="sched-pause-reason"
                  rows={2}
                  maxLength={250}
                  className="flex w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Maintenance in progress"
                  value={pauseReason}
                  onChange={(e) => { setPauseReason(e.target.value); setDirty(true); }}
                  disabled={!canUpdate}
                />
                <p className="text-xs text-muted-foreground">{pauseReason.length}/250</p>
              </div>
            )}
          </div>

          {/* Testing preset */}
          {canUpdate && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Testing helper
              </div>
              <p className="text-xs text-yellow-700">
                Use this only for testing. Real schools should use normal school hours.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyTestingPreset}
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              >
                Open all day for testing
              </Button>
            </div>
          )}

          {/* Save button */}
          {canUpdate && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                disabled={mutation.isPending || !dirty}
                onClick={() => void handleSave()}
              >
                {mutation.isPending ? "Saving…" : "Save schedule"}
              </Button>
              {mutation.isSuccess && !dirty && (
                <span className="text-sm text-green-600">Saved</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

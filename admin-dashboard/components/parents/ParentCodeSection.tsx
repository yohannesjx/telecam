"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  useGenerateParentInvitationCodeMutation,
  useParentInvitationCodesQuery,
  useRevokeParentInvitationCodeMutation,
} from "@/lib/admin/use-parent-codes-queries";
import type {
  ParentInvitationCode,
  ParentInvitationCodeStatus,
} from "@/lib/admin/parent-codes-types";

type LinkedSchool = { id: string; name: string };

type ParentCodeSectionProps = {
  parentId: string;
  schools: LinkedSchool[];
};

function statusBadge(status: ParentInvitationCodeStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-600">Active</Badge>;
    case "used":
      return <Badge variant="secondary">Used</Badge>;
    case "revoked":
      return <Badge variant="outline">Revoked</Badge>;
    case "expired":
      return <Badge variant="outline">Expired</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function ParentCodeSection({ parentId, schools }: ParentCodeSectionProps) {
  const codesQuery = useParentInvitationCodesQuery(parentId);
  const generateMutation = useGenerateParentInvitationCodeMutation(parentId);
  const revokeMutation = useRevokeParentInvitationCodeMutation(parentId);

  // The raw code lives ONLY in component state, only while the success modal
  // is open. We never persist it (no localStorage/sessionStorage) and never log
  // it. Closing the modal clears it.
  const [rawCode, setRawCode] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [revokeTarget, setRevokeTarget] = useState<ParentInvitationCode | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    schools[0]?.id ?? "",
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const codes = codesQuery.data ?? [];
  const activeCode = useMemo(
    () => codes.find((c) => c.status === "active") ?? null,
    [codes],
  );

  const isMutating = generateMutation.isPending || revokeMutation.isPending;
  const hasSchools = schools.length > 0;
  const effectiveSchoolId =
    schools.find((s) => s.id === selectedSchoolId)?.id ?? schools[0]?.id ?? "";

  function closeModal() {
    setRawCode(null);
    setCopyState("idle");
  }

  async function handleGenerate() {
    setActionError(null);
    if (!effectiveSchoolId) {
      setActionError("Select a school before generating a code.");
      return;
    }
    try {
      const result = await generateMutation.mutateAsync({
        schoolId: effectiveSchoolId,
      });
      if (!result.rawCode) {
        setActionError("Server did not return a code. Try again.");
        return;
      }
      setRawCode(result.rawCode);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleConfirmRevoke() {
    if (!revokeTarget) return;
    setActionError(null);
    try {
      await revokeMutation.mutateAsync({ codeId: revokeTarget.id });
      setRevokeTarget(null);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleCopy() {
    if (!rawCode) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(rawCode);
        setCopyState("copied");
        // Reset the label after a moment so the user can copy again.
        window.setTimeout(() => setCopyState("idle"), 1500);
      }
    } catch {
      setCopyState("idle");
    }
  }

  return (
    <SectionCard
      title="Parent App Access"
      description="Generate a 6-digit code the parent enters in the Super App to link their account."
    >
      <div className="space-y-4">
        {!hasSchools ? (
          <p className="text-sm text-muted-foreground">
            Link this parent to a child in a school before generating a code.
          </p>
        ) : null}

        {hasSchools && schools.length > 1 ? (
          <div className="space-y-1">
            <Label htmlFor="parent-code-school">School</Label>
            <select
              id="parent-code-school"
              value={effectiveSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              disabled={isMutating}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {codesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading codes…</p>
        ) : activeCode ? (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Active code exists</p>
            <p className="mt-2 text-sm">
              Code: <span className="font-mono">{activeCode.codePrefix}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Expires: {formatDateTime(activeCode.expiresAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => setRegenerateConfirm(true)}
                disabled={!hasSchools || isMutating}
              >
                {generateMutation.isPending ? "Regenerating…" : "Regenerate Code"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setRevokeTarget(activeCode)}
                disabled={isMutating}
              >
                Revoke Code
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button onClick={handleGenerate} disabled={!hasSchools || isMutating}>
              {generateMutation.isPending ? "Generating…" : "Generate Parent Code"}
            </Button>
          </div>
        )}

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}

        <div>
          <h3 className="text-sm font-semibold">Code history</h3>
          {codes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No codes yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Expires</th>
                    <th className="px-3 py-2">Used</th>
                    <th className="px-3 py-2">Revoked</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{c.codePrefix}</td>
                      <td className="px-3 py-2">{statusBadge(c.status)}</td>
                      <td className="px-3 py-2">{formatDateTime(c.createdAt)}</td>
                      <td className="px-3 py-2">{formatDateTime(c.expiresAt)}</td>
                      <td className="px-3 py-2">{formatDateTime(c.usedAt)}</td>
                      <td className="px-3 py-2">{formatDateTime(c.revokedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {rawCode ? (
        <>
          <button
            type="button"
            aria-label="Close generated code dialog"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Parent Code Generated</h2>
            <p className="mt-4 text-center font-mono text-3xl tracking-widest">
              {rawCode}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Show this code to the parent now. It will not be shown again.
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copyState === "copied" ? "Copied!" : "Copy Code"}
              </Button>
              <Button className="flex-1" onClick={closeModal}>
                Done
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {regenerateConfirm ? (
        <>
          <button
            type="button"
            aria-label="Close regenerate confirmation"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setRegenerateConfirm(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Regenerate parent code?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Regenerating will invalidate any previous unused code for this parent.
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRegenerateConfirm(false)}
                disabled={generateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  setRegenerateConfirm(false);
                  await handleGenerate();
                }}
                disabled={generateMutation.isPending}
              >
                Regenerate
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {revokeTarget ? (
        <>
          <button
            type="button"
            aria-label="Close revoke confirmation"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setRevokeTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Revoke parent code?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will invalidate the current code.
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRevokeTarget(null)}
                disabled={revokeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmRevoke}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? "Revoking…" : "Revoke"}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}

"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRtspHostWarning } from "@/lib/rtsp-validation";

type RtspUrlFieldProps = {
  name?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
};

export function RtspUrlField({
  name = "rtsp_url",
  label = "RTSP URL",
  required = false,
  placeholder = "rtsp://user:pass@100.x.y.z:554/Streaming/Channels/102",
  helperText,
}: RtspUrlFieldProps) {
  const { register, watch, formState } = useFormContext();
  const value = watch(name) as string | undefined;
  const error = formState.errors[name]?.message as string | undefined;
  const warning = value ? getRtspHostWarning(value) : null;
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        type="password"
        autoComplete="new-password"
        placeholder={placeholder}
        {...register(name)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
        }}
      />
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      {!helperText && !required ? (
        <p className="text-xs text-muted-foreground">
          Existing RTSP URL is hidden for security. Enter a new URL only to replace it.
        </p>
      ) : null}
      {warning ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {warning} Recommend Tailscale/private IP such as 100.x.x.x, 10.x.x.x, 172.16–31.x.x, or
          192.168.x.x.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {focused ? (
        <p className="text-xs text-muted-foreground">
          RTSP credentials are write-only and never displayed after save.
        </p>
      ) : null}
    </div>
  );
}

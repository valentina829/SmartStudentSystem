import { type ReactNode } from "react";
import { twMerge } from "@/lib/utils";
import type { AttendanceStatus, SessionStatus } from "@/lib/supabase";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-100 text-success-700",
    warning: "bg-warning-100 text-warning-700",
    danger: "bg-danger-100 text-danger-700",
  };
  return <span className={twMerge("chip", tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  if (status === "present") return <Badge tone="success">Present</Badge>;
  if (status === "late") return <Badge tone="warning">Late</Badge>;
  return <Badge tone="danger">Absent</Badge>;
}

export function SessionBadge({ status }: { status: SessionStatus }) {
  if (status === "open") return <Badge tone="success">Live</Badge>;
  return <Badge tone="neutral">Closed</Badge>;
}

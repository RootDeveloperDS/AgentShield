"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  if (norm === "COMPLETED") {
    return <span className="badge badge-emerald">● COMPLETED</span>;
  }
  if (norm === "FLAGGED_HUMAN_REVIEW") {
    return <span className="badge badge-amber">▲ HUMAN REVIEW</span>;
  }
  if (norm === "REJECTED_POLICY" || norm === "FAILED") {
    return <span className="badge badge-rose">✕ REJECTED</span>;
  }
  if (norm === "PENDING") {
    return <span className="badge badge-sky">◌ PENDING</span>;
  }
  if (norm === "CANCELLED") {
    return <span className="badge badge-slate">⊘ CANCELLED</span>;
  }

  return <span className="badge badge-slate">{norm || "UNKNOWN"}</span>;
}

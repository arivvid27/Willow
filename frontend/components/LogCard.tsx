"use client";
// components/LogCard.tsx — theme-aware log card

import type { Log } from "@/lib/types";
import MoodBadge from "./MoodBadge";
import { Moon, Pill, FileText, Clock } from "lucide-react";

interface LogCardProps { log: Log; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

const DAY_RATING_CONFIG = {
  good:    { emoji: "😊", label: "Good day",     color: "#22c55e" },
  neutral: { emoji: "😐", label: "Neutral day",  color: "#eab308" },
  bad:     { emoji: "😔", label: "Difficult day", color: "#ef4444" },
} as const;

export default function LogCard({ log }: LogCardProps) {
  const meds      = log.medications ?? [];
  const dayRating = (log as any).day_rating as keyof typeof DAY_RATING_CONFIG | null;
  const ratingCfg = dayRating ? DAY_RATING_CONFIG[dayRating] : null;

  return (
    <article
      className="card p-5 hover:shadow-md transition-shadow animate-fade-up"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      aria-label={`Log entry from ${formatDate(log.created_at)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {ratingCfg && (
            <span
              className="text-2xl leading-none"
              aria-label={ratingCfg.label}
              title={ratingCfg.label}
            >
              {ratingCfg.emoji}
            </span>
          )}
          <MoodBadge mood={log.mood} />
        </div>
        <time
          dateTime={log.created_at}
          className="flex items-center gap-1.5 text-xs shrink-0"
          style={{ color: "var(--color-text-subtle)" }}
        >
          <Clock size={12} aria-hidden="true" />
          {formatDate(log.created_at)}
        </time>
      </div>

      {/* Sleep + meds row */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <Moon size={14} aria-hidden="true" style={{ color: "var(--color-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            {log.sleep ?? "—"}h sleep
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Pill size={14} aria-hidden="true" style={{ color: meds.length ? "var(--color-accent)" : "var(--color-border)" }} />
          <span className="text-sm" style={{ color: meds.length ? "var(--color-text-muted)" : "var(--color-text-subtle)" }}>
            {meds.length > 0 ? meds.join(", ") : "No meds recorded"}
          </span>
        </div>
      </div>

      {/* Notes */}
      {log.notes ? (
        <div
          className="rounded-lg p-3 text-sm leading-relaxed"
          style={{ background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-start gap-2">
            <FileText size={13} className="mt-0.5 shrink-0" aria-hidden="true"
              style={{ color: "var(--color-text-subtle)" }} />
            <p style={{ color: "var(--color-text)" }}>{log.notes}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm italic" style={{ color: "var(--color-text-subtle)" }}>
          No notes for this entry.
        </p>
      )}
    </article>
  );
}

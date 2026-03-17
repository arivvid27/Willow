"use client";
// components/LogCard.tsx — theme-aware log card with draft support

import type { Log } from "@/lib/types";
import MoodBadge from "./MoodBadge";
import { Moon, Pill, FileText, Clock, Edit3, Clock3 } from "lucide-react";
import Link from "next/link";

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
  const isDraft   = log.status === "draft";

  return (
    <article
      className="card p-5 hover:shadow-md transition-shadow animate-fade-up"
      style={{
        background:   "var(--color-surface)",
        borderColor:  isDraft ? "var(--color-accent)" : "var(--color-border)",
        borderStyle:  isDraft ? "dashed" : "solid",
        borderWidth:  isDraft ? "1.5px" : "1px",
        opacity:      isDraft ? 0.92 : 1,
      }}
      aria-label={`${isDraft ? "Draft" : "Log"} entry from ${formatDate(log.created_at)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Draft badge */}
          {isDraft && (
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-accent-light)",
                color:      "var(--color-accent)",
                border:     "1px solid var(--color-border-strong)",
              }}
            >
              <Clock3 size={11} aria-hidden="true" /> Draft
            </span>
          )}
          {ratingCfg && (
            <span className="text-2xl leading-none" aria-label={ratingCfg.label} title={ratingCfg.label}>
              {ratingCfg.emoji}
            </span>
          )}
          {log.mood != null && <MoodBadge mood={log.mood} />}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Edit button — always visible, any team member */}
          <Link
            href={`/dashboard/log?edit=${log.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
            style={{ color: "var(--color-text-muted)", background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-light)";
              e.currentTarget.style.color      = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-bg-subtle)";
              e.currentTarget.style.color      = "var(--color-text-muted)";
            }}
            aria-label="Edit log"
          >
            <Edit3 size={13} aria-hidden="true" />
            Edit
          </Link>

          <time
            dateTime={log.created_at}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <Clock size={12} aria-hidden="true" />
            {formatDate(log.created_at)}
          </time>
        </div>
      </div>

      {/* Updated-at note for drafts */}
      {isDraft && log.updated_at && log.updated_at !== log.created_at && (
        <p className="text-xs mb-3" style={{ color: "var(--color-text-subtle)" }}>
          Last edited {formatDate(log.updated_at)}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
        {log.sleep != null && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Moon size={13} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
            {log.sleep}h sleep
          </span>
        )}
        {meds.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Pill size={13} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
            {meds.join(", ")}
          </span>
        )}
      </div>

      {/* Notes */}
      {log.notes && (
        <div
          className="flex items-start gap-2 text-sm p-3 rounded-lg"
          style={{ background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}
        >
          <FileText size={14} style={{ color: "var(--color-text-subtle)", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <p style={{ color: "var(--color-text)" }}>{log.notes}</p>
        </div>
      )}
    </article>
  );
}

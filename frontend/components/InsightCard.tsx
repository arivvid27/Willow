"use client";
// components/InsightCard.tsx — theme-aware AI insight panel

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { analyzeLogs } from "@/lib/api";
import type { Log, AnalyzeResponse } from "@/lib/types";
import { Sparkles, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

interface InsightCardProps {
  profileName: string;
  logs: Log[];
}

type SectionKey = "summary" | "pattern_analysis" | "suggested_adjustments";

export default function InsightCard({ profileName, logs }: InsightCardProps) {
  const [result,   setResult]   = useState<AnalyzeResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [expanded, setExpanded] = useState<SectionKey | null>("summary");

  const recentLogs = logs.slice(0, 7);

  async function runAnalysis() {
    if (recentLogs.length === 0) { setError("No logs available to analyze. Add at least one daily log first."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await analyzeLogs({
        profile_name: profileName,
        logs: recentLogs.map((l) => ({
          mood: l.mood, sleep: l.sleep, medications: l.medications ?? [],
          notes: l.notes ?? undefined, created_at: l.created_at,
        })),
      });
      setResult(data);
      setExpanded("summary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(key: SectionKey) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  const sections: { key: SectionKey; label: string; emoji: string }[] = [
    { key: "summary",               label: "Overview",              emoji: "📋" },
    { key: "pattern_analysis",      label: "Pattern Analysis",      emoji: "🔍" },
    { key: "suggested_adjustments", label: "Suggested Adjustments", emoji: "💡" },
  ];

  return (
    <section aria-label="AI Insight Panel" className="space-y-4">
      {/* Trigger card */}
      <div
        className="card-elevated p-6"
        style={{
          borderLeft:  "4px solid var(--color-accent)",
          background:  "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--color-accent)" }}
            aria-hidden="true"
          >
            <Sparkles size={18} style={{ color: "var(--color-accent-text)" }} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              AI Care Insights
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Willow's AI — guided by BCBA principles — will analyze{" "}
              <strong>{recentLogs.length}</strong> recent log{recentLogs.length !== 1 ? "s" : ""} for{" "}
              <strong>{profileName}</strong> and surface trends, patterns, and actionable suggestions.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-primary"
            aria-busy={loading}
          >
            {loading ? (
              <><LoadingSpinner size={16} label="Analyzing…" /> Analyzing…</>
            ) : (
              <><Sparkles size={16} aria-hidden="true" /> {result ? "Re-analyze" : "Analyze last 7 logs"}</>
            )}
          </button>
          {result && !loading && (
            <button onClick={runAnalysis} className="btn-ghost" aria-label="Refresh analysis">
              <RefreshCw size={15} aria-hidden="true" /> Refresh
            </button>
          )}
        </div>

        <p className="text-xs mt-3" style={{ color: "var(--color-text-subtle)" }}>
          ⚠️ AI insights are supportive tools only — always consult qualified medical professionals.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="card p-4 flex items-start gap-3"
          style={{ borderLeft: "4px solid var(--color-danger)", background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <AlertCircle size={18} style={{ color: "var(--color-danger)" }} aria-hidden="true" className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm mb-0.5" style={{ color: "var(--color-danger)" }}>Analysis error</p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{error}</p>
          </div>
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div
          className="card p-6 space-y-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          aria-busy="true"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-4 rounded-full animate-pulse"
              style={{ background: "var(--color-border)", width: n === 1 ? "90%" : n === 2 ? "75%" : "60%" }}
            />
          ))}
          <p className="text-sm mt-2" style={{ color: "var(--color-text-subtle)" }}>
            Reviewing {recentLogs.length} logs…
          </p>
        </div>
      )}

      {/* Results accordion */}
      {result && !loading && (
        <div className="space-y-3 animate-fade-up" aria-live="polite">
          {sections.map(({ key, label, emoji }) => {
            const isOpen  = expanded === key;
            const content = result[key];
            if (!content) return null;

            return (
              <div
                key={key}
                className="card overflow-hidden"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  aria-expanded={isOpen}
                  aria-controls={`section-${key}`}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                  style={{ color: "var(--color-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="flex items-center gap-2.5 font-medium text-sm">
                    <span aria-hidden="true">{emoji}</span>
                    {label}
                  </span>
                  {isOpen
                    ? <ChevronUp  size={16} aria-hidden="true" style={{ color: "var(--color-text-subtle)" }} />
                    : <ChevronDown size={16} aria-hidden="true" style={{ color: "var(--color-text-subtle)" }} />
                  }
                </button>

                {isOpen && (
                  <div
                    id={`section-${key}`}
                    className="px-5 pb-5 pt-1"
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <div className="prose-willow text-sm">
                      {key === "summary"
                        ? <p className="leading-relaxed" style={{ color: "var(--color-text)" }}>{content}</p>
                        : <ReactMarkdown>{content}</ReactMarkdown>
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

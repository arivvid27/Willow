"use client";
// app/dashboard/page.tsx — Dashboard with delete, realtime, and AI weekly summary

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Log, Profile } from "@/lib/types";
import LogCard from "@/components/LogCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  PlusCircle, Activity, Moon, Smile, RefreshCw,
  Trash2, Sparkles, X, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

// ── AI quick-summary via backend ──────────────────────────────

async function fetchQuickSummary(profileName: string, logs: Log[], profileContext?: string): Promise<string> {
  const res = await fetch(
    `${typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL ? `https://${process.env.NEXT_PUBLIC_SITE_URL}` : "http://localhost:3000")}/api/analyze`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_name:    profileName,
        profile_context: profileContext,
        logs: logs.slice(0, 7).map((l) => ({
          mood:        l.mood,
          sleep:       l.sleep,
          medications: l.medications ?? [],
          notes:       l.notes ?? undefined,
          created_at:  l.created_at,
        })),
      }),
    }
  );
  if (!res.ok) throw new Error("Analysis request failed");
  const data = await res.json();
  return data.summary as string;
}

// ── Delete confirmation modal ─────────────────────────────────

function DeleteModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirm delete log"
        className="animate-fade-up"
        style={{
          position:     "fixed",
          top:          "50%",
          left:         "50%",
          transform:    "translate(-50%, -50%)",
          width:        "min(400px, calc(100vw - 32px))",
          zIndex:       60,
          borderRadius: "16px",
          background:   "var(--color-surface)",
          border:       "1px solid var(--color-border)",
          boxShadow:    "0 24px 64px rgba(0,0,0,0.22)",
          padding:      "24px",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle size={20} style={{ color: "var(--color-danger)" }} aria-hidden="true" />
          </div>
          <h2 className="font-display font-semibold text-lg" style={{ color: "var(--color-text)" }}>
            Delete this log?
          </h2>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
          This log entry will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "var(--color-danger)",
              color:      "white",
              border:     "none",
              cursor:     loading ? "not-allowed" : "pointer",
              opacity:    loading ? 0.6 : 1,
            }}
          >
            {loading ? <LoadingSpinner size={14} label="Deleting…" /> : <Trash2 size={14} />}
            {loading ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            onClick={onCancel}
            className="btn-ghost text-sm px-4 py-2"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── AI Summary banner ─────────────────────────────────────────

function AISummaryBanner({
  profileName,
  logs,
  profileContext,
}: {
  profileName:      string;
  logs:             Log[];
  profileContext?:  string;
}) {
  const [summary,  setSummary]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(false);
  const [dismissed,setDismissed]= useState(false);
  const fetchedFor = useRef<string>("");   // track which profile+logcount we fetched for

  const key = `${profileName}-${logs.length}`;

  useEffect(() => {
    // Only fetch when we have ≥3 logs and haven't fetched for this exact state
    if (logs.length < 3 || fetchedFor.current === key || dismissed) return;

    let cancelled = false;
    fetchedFor.current = key;
    setLoading(true);
    setError(false);

    fetchQuickSummary(profileName, logs, profileContext)
      .then((s) => { if (!cancelled) { setSummary(s); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });

    return () => { cancelled = true; };
  }, [key, logs, profileName, dismissed]);

  // Refresh summary on demand
  function refresh() {
    fetchedFor.current = "";
    setSummary(null);
    setError(false);
    setDismissed(false);
  }

  if (dismissed || logs.length < 3) return null;

  return (
    <div
      className="rounded-2xl p-5 animate-fade-up"
      style={{
        background:  "var(--color-surface)",
        border:      "1.5px solid var(--color-accent)",
        boxShadow:   "0 4px 20px rgba(0,0,0,0.07)",
      }}
      aria-label="AI weekly summary"
      aria-live="polite"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--color-accent)" }}
            aria-hidden="true"
          >
            <Sparkles size={14} style={{ color: "var(--color-accent-text)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Willow's take on {profileName}'s week
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              Based on the last {Math.min(logs.length, 7)} log{logs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!loading && (
            <button
              onClick={refresh}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--color-text-subtle)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              aria-label="Refresh AI summary"
              title="Refresh summary"
            >
              <RefreshCw size={13} aria-hidden="true" />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-text-subtle)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            aria-label="Dismiss summary"
            title="Dismiss"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <LoadingSpinner size={16} label="Generating summary…" />
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Willow is reviewing the week…
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Couldn't load summary right now.{" "}
          <button onClick={refresh} className="underline" style={{ color: "var(--color-accent)" }}>
            Retry
          </button>
        </p>
      )}

      {summary && !loading && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {summary}
        </p>
      )}

      <p className="text-xs mt-3 pt-3" style={{ color: "var(--color-text-subtle)", borderTop: "1px solid var(--color-border)" }}>
        AI summaries are supportive only — always consult qualified professionals for clinical decisions.
      </p>
    </div>
  );
}

// ── Main dashboard page ───────────────────────────────────────

export default function DashboardPage() {
  const router  = useRouter();
  const supabase = getSupabase();

  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [profileContext, setProfileContext]  = useState("");
  const [logs,           setLogs]           = useState<Log[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [deleteLoading,  setDeleteLoading]  = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: allRows } = await supabase
      .from("caregiver_access")
      .select("profile_id")
      .eq("user_id", user.id);

    const savedId = typeof window !== "undefined"
      ? localStorage.getItem("willow:active_profile") : null;
    const arr = allRows ?? [];
    const accessRows = (savedId ? arr.find((r: any) => r.profile_id === savedId) : arr[0]) ?? arr[0];

    if (!accessRows) {
      setError("No profile found. Please complete account setup.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileErr } = await supabase
      .from("profiles").select("*").eq("id", accessRows.profile_id).single();
    if (profileErr) { setError(profileErr.message); setLoading(false); return; }
    setProfile(profileData);

    const { data: logsData, error: logsErr } = await supabase
      .from("logs").select("*")
      .eq("profile_id", accessRows.profile_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (logsErr) { setError(logsErr.message); setLoading(false); return; }
    setLogs(logsData ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: listen for new inserts AND deletes
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`logs-dashboard:${profile.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "logs",
        filter: `profile_id=eq.${profile.id}`,
      }, (payload) => {
        setLogs((prev) => {
          if (prev.find((l) => l.id === (payload.new as Log).id)) return prev;
          return [payload.new as Log, ...prev];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "logs",
        filter: `profile_id=eq.${profile.id}`,
      }, (payload) => {
        setLogs((prev) => prev.map((l) =>
          l.id === (payload.new as Log).id ? (payload.new as Log) : l
        ));
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "logs",
        filter: `profile_id=eq.${profile.id}`,
      }, (payload) => {
        setLogs((prev) => prev.filter((l) => l.id !== (payload.old as Log).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, supabase]);

  // Delete handler
  async function handleDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("logs").delete().eq("id", deletingId);
    if (!error) {
      setLogs((prev) => prev.filter((l) => l.id !== deletingId));
    }
    setDeleteLoading(false);
    setDeletingId(null);
  }

  // Stats
  const last7    = logs.slice(0, 7);
  const avgMood  = last7.length ? (last7.reduce((s, l) => s + l.mood,  0) / last7.length).toFixed(1) : "—";
  const avgSleep = last7.length ? (last7.reduce((s, l) => s + (l.sleep ?? 0), 0) / last7.length).toFixed(1) : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" aria-live="polite">
        <LoadingSpinner size={28} label="Loading dashboard…" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="card p-6 text-center"
        style={{ borderLeft: "4px solid var(--color-danger)", background: "var(--color-surface)" }}>
        <p className="text-sm mb-3" style={{ color: "var(--color-danger)" }}>{error}</p>
        <button onClick={loadData} className="btn-ghost text-sm">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 animate-fade-up stagger-1">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold leading-tight"
            style={{ color: "var(--color-text)" }}>
            {profile?.child_name ? `${profile.child_name}'s Dashboard` : "Care Dashboard"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Real-time care log feed
          </p>
        </div>
        <Link href="/dashboard/log" className="btn-primary shrink-0">
          <PlusCircle size={16} aria-hidden="true" />
          <span className="hidden sm:inline">New Log</span>
          <span className="sm:hidden">Log</span>
        </Link>
      </header>

      {/* ── Stats row ────────────────────────────────────────── */}
      {last7.length > 0 && (
        <div className="grid grid-cols-3 gap-3 animate-fade-up stagger-2" aria-label="7-day summary statistics">
          {[
            { label: "Logs this week", value: last7.length, icon: Activity, unit: "" },
            { label: "Avg mood",       value: avgMood,       icon: Smile,    unit: "/10" },
            { label: "Avg sleep",      value: avgSleep,      icon: Moon,     unit: "h" },
          ].map(({ label, value, icon: Icon, unit }) => (
            <div
              key={label}
              className="card p-4 text-center"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              aria-label={`${label}: ${value}${unit}`}
            >
              <Icon size={18} className="mx-auto mb-1.5" aria-hidden="true"
                style={{ color: "var(--color-accent)" }} />
              <p className="font-display text-xl font-bold" style={{ color: "var(--color-text)" }}>
                {value}
                <span className="text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                  {unit}
                </span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AI weekly summary (shows after 3+ logs) ──────────── */}
      {profile && logs.length >= 3 && (
        <div className="animate-fade-up stagger-3">
          <AISummaryBanner profileName={profile.child_name} logs={logs} profileContext={profileContext} />
        </div>
      )}

      {/* ── Log feed ─────────────────────────────────────────── */}
      <section aria-label="Recent care logs" aria-live="polite" aria-atomic="false">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>
            Recent Logs
          </h2>
          <button
            onClick={loadData}
            className="btn-ghost text-xs px-2.5 py-1.5"
            aria-label="Refresh logs"
          >
            <RefreshCw size={13} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <div
            className="card p-10 text-center animate-fade-up"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="text-4xl mb-3" aria-hidden="true">📋</div>
            <h3 className="font-display text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>
              No logs yet
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              Start tracking {profile?.child_name ?? "your care recipient"}'s daily wellbeing.
            </p>
            <Link href="/dashboard/log" className="btn-primary inline-flex">
              <PlusCircle size={16} aria-hidden="true" />
              Add first log
            </Link>
          </div>
        ) : (() => {
            const drafts    = logs.filter((l) => l.status === "draft");
            const published = logs.filter((l) => l.status !== "draft");

            const LogRow = ({ log, i }: { log: (typeof logs)[0]; i: number }) => (
              <div
                key={log.id}
                className="animate-fade-up relative group"
                style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}
              >
                <LogCard log={log} />
                <button
                  onClick={() => setDeletingId(log.id)}
                  className="absolute top-3 right-14 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all touch-visible-delete"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "var(--color-danger)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface)"; e.currentTarget.style.color = "var(--color-text-subtle)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
                  aria-label={`Delete log from ${new Date(log.created_at).toLocaleDateString()}`}
                  title="Delete"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            );

            return (
              <div className="space-y-6">
                {drafts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--color-text-subtle)" }}>Drafts in progress</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                        {drafts.length}
                      </span>
                    </div>
                    {drafts.map((log, i) => <LogRow key={log.id} log={log} i={i} />)}
                  </div>
                )}
                {published.length > 0 && (
                  <div className="space-y-3">
                    {drafts.length > 0 && (
                      <h3 className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--color-text-subtle)" }}>Published logs</h3>
                    )}
                    {published.map((log, i) => <LogRow key={log.id} log={log} i={i} />)}
                  </div>
                )}
              </div>
            );
          })()}
      </section>

      {/* ── Delete confirmation modal ─────────────────────────── */}
      {deletingId && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

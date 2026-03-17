"use client";
// app/dashboard/insights/page.tsx — AI Insight panel page

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Log } from "@/lib/types";
import InsightCard from "@/components/InsightCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

export default function InsightsPage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Get profile
      const { data: access, error: accessErr } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(child_name, id)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (accessErr || !access) {
        setError("No profile found.");
        setLoading(false);
        return;
      }

      // @ts-expect-error: joined relation
      const pName: string = access.profiles?.child_name ?? "Unknown";
      // @ts-expect-error: joined relation
      const pId: string = access.profiles?.id ?? access.profile_id;
      setProfileName(pName);

      // Build AI context string from care profile fields
      const prof = (access as any).profiles;
      const ctxParts: string[] = [];
      if (prof?.diagnoses?.length)       ctxParts.push(`Diagnoses: ${prof.diagnoses.join(", ")}`);
      if (prof?.allergies?.length)       ctxParts.push(`Allergies/Sensitivities: ${prof.allergies.join(", ")}`);
      if (prof?.therapist_name)          ctxParts.push(`Therapist: ${prof.therapist_name}`);
      if (prof?.school_name)             ctxParts.push(`School: ${prof.school_name}`);
      if (prof?.additional_notes)        ctxParts.push(`Additional context: ${prof.additional_notes}`);
      if (ctxParts.length) setProfileContext(ctxParts.join("\n"));

      // Fetch last 7 days of logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: logsData, error: logsErr } = await supabase
        .from("logs")
        .select("*")
        .eq("profile_id", pId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(7);

      if (logsErr) { setError(logsErr.message); setLoading(false); return; }
      setLogs(logsData ?? []);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size={28} label="Loading insights…" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="card p-6" style={{ borderLeft: "4px solid var(--color-danger)" }}>
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm hover:underline animate-fade-up"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Back to dashboard"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to dashboard
      </Link>

      <header className="animate-fade-up stagger-1">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold">
          AI Care Insights
        </h1>
        <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
          <Calendar size={13} aria-hidden="true" />
          Analyzing the last 7 days for <strong>{profileName}</strong>
          &nbsp;·&nbsp;
          <span>{logs.length} log{logs.length !== 1 ? "s" : ""} available</span>
        </p>
      </header>

      <div className="animate-fade-up stagger-2">
        <InsightCard profileName={profileName} logs={logs} profileContext={profileContext} />
      </div>

      {logs.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
            No logs in the last 7 days. Add some daily logs to enable AI analysis.
          </p>
          <Link href="/dashboard/log" className="btn-primary inline-flex text-sm">
            Add a log
          </Link>
        </div>
      )}
    </div>
  );
}

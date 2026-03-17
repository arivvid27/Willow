"use client";
// app/dashboard/chat/page.tsx — AI Chat page

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { Log } from "@/lib/types";
import WillowChat from "@/components/WillowChat";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  const router = useRouter();
  const [profileName,    setProfileName]    = useState("");
  const [profileContext, setProfileContext] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get profile
      const { data: allChatAccess } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(child_name, id, full_name, diagnoses, allergies, therapist_name, school_name, additional_notes)")
        .eq("user_id", user.id);
      const savedChatId = typeof window !== "undefined"
        ? localStorage.getItem("willow:active_profile") : null;
      const chatArr = allChatAccess ?? [];
      const access = (savedChatId ? chatArr.find((a: any) => a.profile_id === savedChatId) : chatArr[0]) ?? chatArr[0];

      if (!access) {
        setError("No profile found.");
        setLoading(false);
        return;
      }

      // @ts-expect-error: joined relation
      const pName: string = access.profiles?.child_name ?? "Unknown";
      // @ts-expect-error: joined relation
      const pId: string = access.profiles?.id ?? access.profile_id;
      setProfileName(pName);

      // Build care profile context for AI
      const prof = (access as any).profiles;
      const ctx: string[] = [];
      if (prof?.diagnoses?.length)   ctx.push(`Diagnoses: ${prof.diagnoses.join(", ")}`);
      if (prof?.allergies?.length)   ctx.push(`Allergies/Sensitivities: ${prof.allergies.join(", ")}`);
      if (prof?.therapist_name)      ctx.push(`Therapist: ${prof.therapist_name}`);
      if (prof?.school_name)         ctx.push(`School: ${prof.school_name}`);
      if (prof?.additional_notes)    ctx.push(`Context: ${prof.additional_notes}`);
      if (ctx.length) setProfileContext(ctx.join("\n"));

      // Fetch last 14 days of logs for richer chat context
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: logsData, error: logsErr } = await supabase
        .from("logs")
        .select("*")
        .eq("profile_id", pId)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(14);

      if (logsErr) {
        setError(logsErr.message);
        setLoading(false);
        return;
      }

      setLogs(logsData ?? []);
      setLoading(false);
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size={28} label="Loading chat…" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="card p-6"
        style={{ borderLeft: "4px solid var(--color-danger)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm hover:underline animate-fade-up"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Back to dashboard"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to dashboard
      </Link>

      {/* Header */}
      <header className="animate-fade-up stagger-1">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold">
          Chat with Willow
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Ask anything about{" "}
          <strong>{profileName}</strong>'s care — I have the last{" "}
          <strong>{logs.length}</strong> log
          {logs.length !== 1 ? "s" : ""} as context.
        </p>
      </header>

      {/* Chat panel */}
      <div className="animate-fade-up stagger-2" style={{ borderRadius: "var(--radius-lg)" }}>
        <WillowChat profileName={profileName} logs={logs} profileContext={profileContext} />
      </div>
    </div>
  );
}

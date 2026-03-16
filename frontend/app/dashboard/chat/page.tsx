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
  const [profileName, setProfileName] = useState("");
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
        <WillowChat profileName={profileName} logs={logs} />
      </div>
    </div>
  );
}

"use client";
// app/dashboard/log/page.tsx — New daily log page

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import LogForm from "@/components/LogForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewLogPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: allLogAccess } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(child_name)")
        .eq("user_id", user.id);
      const savedLogId = typeof window !== "undefined"
        ? localStorage.getItem("willow:active_profile") : null;
      const logArr = allLogAccess ?? [];
      const access = (savedLogId ? logArr.find((a: any) => a.profile_id === savedLogId) : logArr[0]) ?? logArr[0];
      const accessErr = !access;

      if (accessErr || !access) {
        setError("Could not find your profile. Please check your account setup.");
        setLoading(false);
        return;
      }

      setProfileId(access.profile_id);
      // @ts-expect-error: joined relation typing
      setProfileName(access.profiles?.child_name ?? "");
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size={28} label="Loading form…" />
      </div>
    );
  }

  if (error || !profileId || !userId) {
    return (
      <div role="alert" className="card p-6" style={{ borderLeft: "4px solid var(--color-danger)" }}>
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error ?? "Setup incomplete."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          New daily log
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Logging for <strong>{profileName}</strong>
        </p>
      </header>

      {/* Form card */}
      <div className="card-elevated p-6 lg:p-8 animate-fade-up stagger-2">
        <LogForm
          profileId={profileId}
          caregiverId={userId}
          onSuccess={() => router.push("/dashboard")}
        />
      </div>
    </div>
  );
}

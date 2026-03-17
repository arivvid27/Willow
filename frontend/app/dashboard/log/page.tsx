"use client";
// app/dashboard/log/page.tsx — New log or edit existing draft/log

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import LogForm from "@/components/LogForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewLogPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");

  const [profileId,   setProfileId]   = useState<string | null>(null);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

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

      if (!access) { setError("Could not find your profile."); setLoading(false); return; }

      setProfileId(access.profile_id);
      setProfileName((access as any).profiles?.child_name ?? "");

      if (editId) {
        const { data: log, error: logErr } = await supabase
          .from("logs").select("*")
          .eq("id", editId)
          .eq("profile_id", access.profile_id)
          .single();

        if (logErr || !log) { setError("Could not load log for editing."); setLoading(false); return; }

        setInitialData({
          dayRating:         log.day_rating          ?? null,
          mood:              log.mood                 ?? 5,
          sleep:             log.sleep  != null       ? String(log.sleep)         : "",
          hoursSchool:       log.hours_school  != null ? String(log.hours_school)  : "",
          hoursOutdoor:      log.hours_outdoor != null ? String(log.hours_outdoor) : "",
          hoursAba:          log.hours_aba     != null ? String(log.hours_aba)     : "",
          hoursHome:         log.hours_home    != null ? String(log.hours_home)    : "",
          hoursScreen:       log.hours_screen  != null ? String(log.hours_screen)  : "",
          outdoorActivities: log.outdoor_activities   ?? [],
          medications:       log.medications          ?? [],
          foodBreakfast:     log.food_breakfast       ?? [],
          foodLunch:         log.food_lunch           ?? [],
          foodDinner:        log.food_dinner          ?? [],
          foodSnacks:        log.food_snacks          ?? [],
          notes:             log.notes                ?? "",
        });
      }
      setLoading(false);
    }
    init();
  }, [router, editId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size={28} label="Loading…" />
    </div>
  );

  if (error || !profileId || !userId) return (
    <div role="alert" className="card p-6" style={{ borderLeft: "4px solid var(--color-danger)" }}>
      <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error ?? "Setup incomplete."}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm hover:underline animate-fade-up"
        style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to dashboard
      </Link>

      <header className="animate-fade-up stagger-1">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold" style={{ color: "var(--color-text)" }}>
          {editId ? "Edit log entry" : "New daily log"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          {editId
            ? <>Editing log for <strong>{profileName}</strong> · changes are visible to the whole team</>
            : <>Logging for <strong>{profileName}</strong></>
          }
        </p>
      </header>

      <div className="card-elevated p-6 lg:p-8 animate-fade-up stagger-2">
        <LogForm
          profileId={profileId}
          caregiverId={userId}
          draftId={editId ?? undefined}
          initialData={editId ? initialData : undefined}
          onSuccess={() => router.push("/dashboard")}
        />
      </div>
    </div>
  );
}

"use client";
// app/auth/callback/page.tsx
// Supabase redirects here after Google OAuth.
// Exchanges the code for a session, then:
//   - New user  → asks for care recipient name → creates profile + caregiver_access
//   - Returning → straight to dashboard

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Leaf, UserPlus } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AuthCallbackPage() {
  const router  = useRouter();
  const [status, setStatus]    = useState<"loading" | "new_user" | "error">("loading");
  const [childName, setChildName] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const supabase = getSupabase();

      // Exchange the auth code in the URL for a real session
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr || !session) {
        setStatus("error");
        setError("Could not complete sign-in. Please try again.");
        return;
      }

      const userId = session.user.id;

      // Check if this user already has a profile
      const { data: existing } = await supabase
        .from("caregiver_access")
        .select("profile_id")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (existing) {
        // Returning user — go straight to dashboard
        router.replace("/dashboard");
      } else {
        // New Google user — need to collect care recipient name
        setStatus("new_user");
      }
    }

    handleCallback();
  }, [router]);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!childName.trim()) return;
    setSaving(true);

    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Please sign in again."); setSaving(false); return; }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .insert({ child_name: childName.trim(), created_by: user.id })
      .select()
      .single();

    if (profileErr) { setError(profileErr.message); setSaving(false); return; }

    await supabase.from("caregiver_access").insert({
      profile_id: profile.id,
      user_id:    user.id,
      role:       "owner",
    });

    router.replace("/dashboard");
  }

  // ── Loading ─────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <main className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}>
        <div className="text-center space-y-4">
          <LoadingSpinner size={32} label="Completing sign-in…" />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Completing sign-in…
          </p>
        </div>
      </main>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6"
        style={{ background: "var(--color-bg)" }}>
        <div className="card-elevated p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">😕</p>
          <h1 className="font-display text-xl font-semibold mb-2"
            style={{ color: "var(--color-text)" }}>Sign-in failed</h1>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>{error}</p>
          <a href="/login" className="btn-primary inline-flex">Try again</a>
        </div>
      </main>
    );
  }

  // ── New Google user — collect care recipient name ─────────────
  return (
    <main className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}>
            <Leaf size={20} style={{ color: "var(--color-accent-text)" }} />
          </div>
          <span className="font-display text-2xl font-semibold"
            style={{ color: "var(--color-accent)" }}>Willow</span>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)" }}>
          <h1 className="font-display text-2xl font-semibold mb-1"
            style={{ color: "var(--color-text)" }}>One last thing</h1>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Who are you coordinating care for?
          </p>

          <form onSubmit={handleCreateProfile} noValidate className="space-y-4">
            <div>
              <label htmlFor="childName" className="label">Care recipient's name</label>
              <input
                id="childName"
                type="text"
                required
                autoFocus
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="input"
                placeholder="e.g. Jamie"
              />
              <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
                The person whose care you are coordinating.
              </p>
            </div>

            {error && (
              <p role="alert" className="text-sm rounded-lg p-3"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={saving} className="btn-primary w-full justify-center" aria-busy={saving}>
              <UserPlus size={17} aria-hidden="true" />
              {saving ? "Setting up…" : "Get started"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

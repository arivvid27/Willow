"use client";
// app/dashboard/settings/page.tsx — Team settings + invite codes

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { ArrowLeft, Copy, RefreshCw, Users, UserPlus, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

interface InviteCode {
  id:         string;
  code:       string;
  role:       string;
  used_by:    string | null;
  used_at:    string | null;
  expires_at: string;
  created_at: string;
}

interface TeamMember {
  user_id:      string;
  role:         string;
  email:        string;
  full_name:    string;
  joined_at:    string;
}

function CodeBadge({ code, onCopy }: { code: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold transition-all active:scale-95"
      style={{
        background:   "var(--color-accent-light)",
        color:        "var(--color-accent)",
        border:       "2px dashed var(--color-border-strong)",
        letterSpacing: "0.15em",
      }}
      aria-label={`Copy invite code ${code}`}
    >
      {code}
      {copied
        ? <Check size={16} aria-hidden="true" />
        : <Copy size={16} aria-hidden="true" />
      }
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [profileId,   setProfileId]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [isOwner,     setIsOwner]     = useState(false);
  const [codes,       setCodes]       = useState<InviteCode[]>([]);
  const [team,        setTeam]        = useState<TeamMember[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [joinCode,    setJoinCode]    = useState("");
  const [joining,     setJoining]     = useState(false);
  const [joinError,   setJoinError]   = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [newRole,     setNewRole]     = useState<"editor" | "viewer">("editor");

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Use the active profile from localStorage (set by sidebar switcher)
    const savedId = typeof window !== "undefined"
      ? localStorage.getItem("willow:active_profile") : null;

    // Fetch all profiles for this user
    const { data: allAccess } = await supabase
      .from("caregiver_access")
      .select("profile_id, role, profiles(id, child_name, full_name)")
      .eq("user_id", user.id);

    if (!allAccess || allAccess.length === 0) { setLoading(false); return; }

    // Pick the active one
    const access = (savedId
      ? allAccess.find((a: any) => a.profile_id === savedId)
      : allAccess[0]) ?? allAccess[0];

    const pid = access.profile_id;
    setProfileId(pid);
    setIsOwner(access.role === "owner");
    const p = (access as any).profiles;
    setProfileName(p?.full_name || p?.child_name || "Unknown");

    // Load invite codes (owner only)
    if (access.role === "owner") {
      const { data: codesData } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("profile_id", pid)
        .order("created_at", { ascending: false })
        .limit(10);
      setCodes(codesData ?? []);
    }

    // Load team members with names + emails via secure RPC function
    const { data: teamData } = await supabase
      .rpc("get_team_members", { p_profile_id: pid });
    setTeam((teamData ?? []).map((t: any) => ({
      user_id:   t.user_id,
      role:      t.role,
      email:     t.email      ?? "",
      full_name: t.full_name  ?? t.email?.split("@")[0] ?? "Caregiver",
      joined_at: t.joined_at,
    })));

    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // ── Generate invite code ───────────────────────────────────
  async function generateCode() {
    if (!profileId || !isOwner) return;
    setGenerating(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate a random 8-char code like "WILW-4F2X"
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const code  = `${part1}-${part2}`;

    const { data, error } = await supabase.from("invite_codes").insert({
      code,
      profile_id: profileId,
      created_by: user!.id,
      role:       newRole,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single();

    if (!error && data) setCodes((prev) => [data, ...prev]);
    setGenerating(false);
  }

  // ── Join with code ─────────────────────────────────────────
  async function joinWithCode() {
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!code) { setJoinError("Please enter a code."); return; }

    setJoining(true); setJoinError(null);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setJoinError("Not signed in."); setJoining(false); return; }

    // Look up the code
    const { data: invite, error: lookupErr } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (lookupErr || !invite) { setJoinError("Code not found. Check for typos."); setJoining(false); return; }
    if (invite.used_by)       { setJoinError("This code has already been used."); setJoining(false); return; }
    if (new Date(invite.expires_at) < new Date()) { setJoinError("This code has expired. Ask the owner for a new one."); setJoining(false); return; }

    // Check if already a member
    const { data: existing } = await supabase
      .from("caregiver_access")
      .select("id")
      .eq("profile_id", invite.profile_id)
      .eq("user_id", user.id)
      .single();

    if (existing) { setJoinError("You already have access to this care profile."); setJoining(false); return; }

    // Grant access
    const { error: accessErr } = await supabase.from("caregiver_access").insert({
      profile_id: invite.profile_id,
      user_id:    user.id,
      role:       invite.role,
    });

    if (accessErr) { setJoinError(accessErr.message); setJoining(false); return; }

    // Mark code as used
    await supabase.from("invite_codes").update({
      used_by: user.id,
      used_at: new Date().toISOString(),
    }).eq("id", invite.id);

    setJoinSuccess(true);
    setJoinCode("");
    setTimeout(() => { router.push("/dashboard"); }, 1500);
  }

  // ── Delete code ────────────────────────────────────────────
  async function deleteCode(id: string) {
    const supabase = getSupabase();
    await supabase.from("invite_codes").delete().eq("id", id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size={28} label="Loading settings…" />
    </div>
  );

  function timeLeft(expires: string) {
    const ms   = new Date(expires).getTime() - Date.now();
    const days = Math.floor(ms / 86400000);
    if (days > 1)  return `${days} days left`;
    if (days === 1) return "1 day left";
    const hrs = Math.floor(ms / 3600000);
    if (hrs > 0)   return `${hrs}h left`;
    return "Expiring soon";
  }

  const activeCodes = codes.filter((c) => !c.used_by && new Date(c.expires_at) > new Date());
  const usedCodes   = codes.filter((c) =>  c.used_by);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm hover:underline"
        style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to dashboard
      </Link>

      <header>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold" style={{ color: "var(--color-text)" }}>
          Team Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Manage who has access to <strong>{profileName}</strong>'s care profile
        </p>
      </header>

      {/* ── Join with a code ────────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-accent-light)" }}>
            <UserPlus size={17} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              Join a care profile
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Enter an invite code from another caregiver
            </p>
          </div>
        </div>

        {joinSuccess ? (
          <div className="text-sm rounded-lg p-3 animate-fade-up"
            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
            ✓ Joined! Redirecting to dashboard…
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinWithCode()}
              placeholder="e.g. WILW-4F2X"
              className="input flex-1 font-mono tracking-widest"
              aria-label="Invite code"
              maxLength={9}
            />
            <button
              type="button"
              onClick={joinWithCode}
              disabled={joining}
              className="btn-primary"
              aria-busy={joining}
            >
              {joining ? <LoadingSpinner size={16} /> : "Join"}
            </button>
          </div>
        )}
        {joinError && (
          <p role="alert" className="text-sm" style={{ color: "var(--color-danger)" }}>{joinError}</p>
        )}
      </div>

      {/* ── Invite codes (owner only) ────────────────────────── */}
      {isOwner && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-accent-light)" }}>
                <Users size={17} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>Invite codes</h2>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Share these with caregivers you want to add</p>
              </div>
            </div>
          </div>

          {/* Generate new code */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
            style={{ background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Role:</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "editor" | "viewer")}
                className="input py-1.5 w-auto pr-8"
                style={{ minHeight: "unset" }}
                aria-label="Invite role"
              >
                <option value="editor">Editor (can add logs)</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={generateCode}
              disabled={generating}
              className="btn-primary"
              aria-busy={generating}
            >
              {generating
                ? <><LoadingSpinner size={16} /> Generating…</>
                : <><RefreshCw size={15} aria-hidden="true" /> Generate code</>
              }
            </button>
          </div>

          {/* Active codes */}
          {activeCodes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-subtle)" }}>Active codes</p>
              {activeCodes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <CodeBadge code={c.code} onCopy={() => {}} />
                    <div>
                      <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                        {c.role}
                      </span>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
                        {timeLeft(c.expires_at)} · expires {new Date(c.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCode(c.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--color-text-subtle)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-danger)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-subtle)"; e.currentTarget.style.background = "transparent"; }}
                    aria-label="Delete code"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Used codes */}
          {usedCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-subtle)" }}>Used codes</p>
              {usedCodes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <span className="font-mono text-sm font-bold tracking-widest"
                    style={{ color: "var(--color-text-muted)" }}>
                    {c.code}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                    Used {c.used_at ? new Date(c.used_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {codes.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>
              No codes yet. Generate one to invite a caregiver.
            </p>
          )}
        </div>
      )}

      {/* ── Current team ─────────────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h2 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
          Current care team — {team.length} member{team.length !== 1 ? "s" : ""}
        </h2>
        <div className="space-y-2">
          {team.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                  {(m.full_name || m.email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                    {m.full_name || m.email.split("@")[0]}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>
                    {m.email} · Joined {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

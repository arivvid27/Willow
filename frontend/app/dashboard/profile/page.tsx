"use client";
// app/dashboard/profile/page.tsx — Care Profile

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { ArrowLeft, User, Save, Plus, X } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProfileData {
  id:                 string;
  child_name:         string;
  full_name:          string;
  date_of_birth:      string;
  diagnoses:          string[];
  allergies:          string[];
  emergency_contact:  string;
  emergency_phone:    string;
  therapist_name:     string;
  school_name:        string;
  additional_notes:   string;
}

// ── Simple inline tag input (no dropdown needed here) ────────────────────────
function TagField({
  label, tags, onChange, placeholder, colorClass,
}: {
  label:       string;
  tags:        string[];
  onChange:    (t: string[]) => void;
  placeholder: string;
  colorClass?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  }

  return (
    <div>
      <label className="label">{label}</label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-70"
              style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-border-strong)" }}
              onClick={() => onChange(tags.filter((x) => x !== t))}
              title="Click to remove"
              role="button"
              aria-label={`Remove ${t}`}
            >
              {t}
              <X size={12} aria-hidden="true" />
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="input flex-1"
          aria-label={`Add ${label}`}
        />
        <button type="button" onClick={add} className="btn-ghost px-3" aria-label={`Add ${label}`}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
        Press Enter or + to add · click a tag to remove
      </p>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <h2 className="font-display font-semibold text-base" style={{ color: "var(--color-text)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CareProfilePage() {
  const router = useRouter();
  const [profile,   setProfile]   = useState<ProfileData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [canEdit,   setCanEdit]   = useState(false);

  const loadProfile = useCallback(async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: allAccess } = await supabase
      .from("caregiver_access")
      .select("profile_id, role, profiles(*)")
      .eq("user_id", user.id);

    const savedId = typeof window !== "undefined"
      ? localStorage.getItem("willow:active_profile") : null;
    const accessArr = allAccess ?? [];
    const access = (savedId
      ? accessArr.find((a: any) => a.profile_id === savedId)
      : accessArr[0]) ?? accessArr[0];

    if (!access) { setError("No profile found."); setLoading(false); return; }

    const p = (access as any).profiles;
    setCanEdit(["owner", "editor"].includes(access.role));
    setProfile({
      id:                p.id,
      child_name:        p.child_name        ?? "",
      full_name:         p.full_name         ?? p.child_name ?? "",
      date_of_birth:     p.date_of_birth     ?? "",
      diagnoses:         p.diagnoses         ?? [],
      allergies:         p.allergies         ?? [],
      emergency_contact: p.emergency_contact ?? "",
      emergency_phone:   p.emergency_phone   ?? "",
      therapist_name:    p.therapist_name    ?? "",
      school_name:       p.school_name       ?? "",
      additional_notes:  p.additional_notes  ?? "",
    });
    setLoading(false);
  }, [router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !canEdit) return;
    setSaving(true); setError(null);

    const supabase = getSupabase();
    const { error } = await supabase.from("profiles").update({
      child_name:        profile.full_name || profile.child_name,
      full_name:         profile.full_name,
      date_of_birth:     profile.date_of_birth     || null,
      diagnoses:         profile.diagnoses,
      allergies:         profile.allergies,
      emergency_contact: profile.emergency_contact || null,
      emergency_phone:   profile.emergency_phone   || null,
      therapist_name:    profile.therapist_name    || null,
      school_name:       profile.school_name       || null,
      additional_notes:  profile.additional_notes  || null,
    }).eq("id", profile.id);

    if (error) { setError(error.message); }
    else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    setSaving(false);
  }

  function update(field: keyof ProfileData, value: any) {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size={28} label="Loading profile…" />
    </div>
  );

  if (!profile) return (
    <div role="alert" className="card p-6"
      style={{ borderLeft: "4px solid var(--color-danger)", background: "var(--color-surface)" }}>
      <p style={{ color: "var(--color-danger)" }}>{error ?? "Profile not found."}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm hover:underline animate-fade-up"
        style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to dashboard
      </Link>

      <header className="flex items-start justify-between gap-4 animate-fade-up stagger-1">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold" style={{ color: "var(--color-text)" }}>
            Care Profile
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {canEdit ? "Profile information for " : "Viewing profile for "}
            <strong>{profile.full_name || profile.child_name}</strong>
          </p>
        </div>
        {!canEdit && (
          <span className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-subtle)", border: "1px solid var(--color-border)" }}>
            View only
          </span>
        )}
      </header>

      <form onSubmit={handleSave} className="space-y-5 animate-fade-up stagger-2">

        {/* ── Basic info ── */}
        <Section title="👤 Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="label">Full name</label>
              <input id="fullName" type="text" className="input"
                value={profile.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder="Full legal name"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label htmlFor="dob" className="label">Date of birth</label>
              <input id="dob" type="date" className="input"
                value={profile.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </Section>

        {/* ── Medical ── */}
        <Section title="🏥 Medical Information">
          <TagField
            label="Diagnoses"
            tags={profile.diagnoses}
            onChange={canEdit ? (t) => update("diagnoses", t) : () => {}}
            placeholder="e.g. Autism Spectrum Disorder, ADHD…"
          />
          <TagField
            label="Allergies & sensitivities"
            tags={profile.allergies}
            onChange={canEdit ? (t) => update("allergies", t) : () => {}}
            placeholder="e.g. Peanuts, Latex, Loud sounds…"
          />
          <div>
            <label htmlFor="therapist" className="label">Primary therapist / specialist</label>
            <input id="therapist" type="text" className="input"
              value={profile.therapist_name}
              onChange={(e) => update("therapist_name", e.target.value)}
              placeholder="Dr. Smith, BCBA"
              disabled={!canEdit}
            />
          </div>
        </Section>

        {/* ── Education ── */}
        <Section title="🏫 Education">
          <div>
            <label htmlFor="school" className="label">School / program name</label>
            <input id="school" type="text" className="input"
              value={profile.school_name}
              onChange={(e) => update("school_name", e.target.value)}
              placeholder="Sunshine Elementary"
              disabled={!canEdit}
            />
          </div>
        </Section>

        {/* ── Emergency contact ── */}
        <Section title="🚨 Emergency Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ecName" className="label">Contact name</label>
              <input id="ecName" type="text" className="input"
                value={profile.emergency_contact}
                onChange={(e) => update("emergency_contact", e.target.value)}
                placeholder="Parent / Guardian name"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label htmlFor="ecPhone" className="label">Phone number</label>
              <input id="ecPhone" type="tel" className="input"
                value={profile.emergency_phone}
                onChange={(e) => update("emergency_phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
                disabled={!canEdit}
              />
            </div>
          </div>
        </Section>

        {/* ── Additional context for AI ── */}
        <Section title="🤖 Additional context for Willow AI">
          <div>
            <label htmlFor="aiNotes" className="label">
              Notes, triggers, communication style, preferences
            </label>
            <textarea id="aiNotes" rows={5} className="input resize-y"
              value={profile.additional_notes}
              onChange={(e) => update("additional_notes", e.target.value)}
              placeholder="e.g. Prefers visual schedules. Loud environments are a major trigger. Responds well to 5-minute transition warnings. Non-verbal, uses AAC device…"
              disabled={!canEdit}
              maxLength={3000}
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
              This context is included in every AI analysis and chat session.
              {profile.additional_notes.length}/3000
            </p>
          </div>
        </Section>

        {error && (
          <p role="alert" className="text-sm rounded-lg p-3"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </p>
        )}

        {canEdit && (
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary" aria-busy={saving}>
              {saving
                ? <><LoadingSpinner size={16} label="Saving…" /> Saving…</>
                : <><Save size={16} aria-hidden="true" /> Save profile</>
              }
            </button>
            {saved && (
              <span className="text-sm animate-fade-in" style={{ color: "var(--color-accent)" }}>
                ✓ Saved
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

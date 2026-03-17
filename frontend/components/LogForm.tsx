"use client";
// components/LogForm.tsx — Extended daily care log (fully theme-aware)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  Moon, Smile, FileText, Save, Clock,
  School, TreePine, Home, Monitor, Utensils, Pill,
  Send, Edit3, Clock3,
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import SmartTagInput from "./SmartTagInput";
import clsx from "clsx";

interface LogFormProps {
  profileId:   string;
  caregiverId: string;
  draftId?:    string;       // existing log id when editing a draft
  initialData?: Partial<DraftData>;  // pre-fill form when editing
  onSuccess?:  () => void;
}

interface DraftData {
  dayRating:        string | null;
  mood:             number;
  sleep:            string;
  hoursSchool:      string;
  hoursOutdoor:     string;
  hoursAba:         string;
  hoursHome:        string;
  hoursScreen:      string;
  outdoorActivities:string[];
  medications:      string[];
  foodBreakfast:    string[];
  foodLunch:        string[];
  foodDinner:       string[];
  foodSnacks:       string[];
  notes:            string;
}

interface FormErrors {
  sleep?: string;
  general?: string;
}

type DayRating = "good" | "neutral" | "bad";

// Day rating uses semantic colors that work on both light/dark
// We use CSS custom properties so they shift with the theme
const DAY_RATINGS: { value: DayRating; emoji: string; label: string; varBg: string; varBorder: string; varText: string }[] = [
  { value: "good",    emoji: "😊", label: "Good",      varBg: "rgba(34,197,94,0.15)",  varBorder: "rgba(34,197,94,0.5)",  varText: "#22c55e" },
  { value: "neutral", emoji: "😐", label: "Neutral",   varBg: "rgba(234,179,8,0.15)",  varBorder: "rgba(234,179,8,0.5)",  varText: "#eab308" },
  { value: "bad",     emoji: "😔", label: "Difficult", varBg: "rgba(239,68,68,0.15)",  varBorder: "rgba(239,68,68,0.5)",  varText: "#ef4444" },
];

const MOOD_LABELS: Record<number, string> = {
  1: "Very difficult", 2: "Difficult", 3: "Challenging",
  4: "Below average",  5: "Average",   6: "Above average",
  7: "Good",           8: "Great",     9: "Excellent", 10: "Outstanding",
};

// Food section accent colors — using rgba so they work on dark bg
const FOOD_SECTIONS = [
  { key: "breakfast", label: "🌅 Breakfast",              placeholder: "Oatmeal, Eggs, Toast…",         accent: "rgba(234,179,8,0.18)",   border: "rgba(234,179,8,0.4)",   tagBg: "rgba(234,179,8,0.2)",   tagText: "var(--color-warn)",    tagBorder: "rgba(234,179,8,0.4)"   },
  { key: "lunch",     label: "☀️ Lunch",                  placeholder: "Sandwich, Rice, Chicken…",      accent: "rgba(59,130,246,0.13)",  border: "rgba(59,130,246,0.35)", tagBg: "rgba(59,130,246,0.18)", tagText: "#60a5fa",              tagBorder: "rgba(59,130,246,0.4)"  },
  { key: "dinner",    label: "🌙 Dinner",                 placeholder: "Pasta, Soup, Grilled Cheese…",  accent: "rgba(139,92,246,0.13)",  border: "rgba(139,92,246,0.35)", tagBg: "rgba(139,92,246,0.18)", tagText: "#a78bfa",              tagBorder: "rgba(139,92,246,0.4)"  },
  { key: "snacks",    label: "🍎 Snacks throughout the day", placeholder: "Crackers, Fruit Cup, Granola…", accent: "rgba(236,72,153,0.13)", border: "rgba(236,72,153,0.35)", tagBg: "rgba(236,72,153,0.18)", tagText: "#f472b6",              tagBorder: "rgba(236,72,153,0.4)"  },
] as const;

// ── Sub-components ────────────────────────────────────────────

function HoursField({ id, label, icon, value, onChange }: {
  id: string; label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span style={{ color: "var(--color-accent)" }} aria-hidden="true">{icon}</span>
        <label htmlFor={id} className="text-sm font-medium truncate" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </label>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          id={id} type="number" min={0} max={24} step={0.5}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="input w-20 text-center"
          aria-label={`${label} hours`}
        />
        <span className="text-sm w-7" style={{ color: "var(--color-text-subtle)" }}>hrs</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div
      className="flex items-center gap-3 pb-3 mb-5"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--color-accent-light)" }}
        aria-hidden="true"
      >
        <span style={{ color: "var(--color-accent)" }}>{icon}</span>
      </div>
      <div>
        <h2 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────

export default function LogForm({ profileId, caregiverId, draftId, initialData, onSuccess }: LogFormProps) {
  const router = useRouter();
  const [dayRating,    setDayRating]    = useState<DayRating | null>((initialData?.dayRating as DayRating) ?? null);
  const [mood,         setMood]         = useState<number>(initialData?.mood ?? 5);
  const [sleep,        setSleep]        = useState<string>(initialData?.sleep ?? "");
  const [hoursSchool,  setHoursSchool]  = useState(initialData?.hoursSchool  ?? "");
  const [hoursOutdoor, setHoursOutdoor] = useState(initialData?.hoursOutdoor ?? "");
  const [hoursAba,     setHoursAba]     = useState(initialData?.hoursAba     ?? "");
  const [hoursHome,    setHoursHome]    = useState(initialData?.hoursHome    ?? "");
  const [hoursScreen,  setHoursScreen]  = useState(initialData?.hoursScreen  ?? "");
  const [outdoorActivities, setOutdoorActivities] = useState<string[]>(initialData?.outdoorActivities ?? []);
  const [medications,   setMedications]   = useState<string[]>(initialData?.medications   ?? []);
  const [foodBreakfast, setFoodBreakfast] = useState<string[]>(initialData?.foodBreakfast ?? []);
  const [foodLunch,     setFoodLunch]     = useState<string[]>(initialData?.foodLunch     ?? []);
  const [foodDinner,    setFoodDinner]    = useState<string[]>(initialData?.foodDinner    ?? []);
  const [foodSnacks,    setFoodSnacks]    = useState<string[]>(initialData?.foodSnacks    ?? []);
  const [notes,       setNotes]       = useState(initialData?.notes ?? "");
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [loading,     setLoading]     = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved,  setDraftSaved]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(draftId);
  const isEditing = !!currentDraftId;

  const foodState: Record<string, { tags: string[]; setter: (t: string[]) => void }> = {
    breakfast: { tags: foodBreakfast, setter: setFoodBreakfast },
    lunch:     { tags: foodLunch,     setter: setFoodLunch },
    dinner:    { tags: foodDinner,    setter: setFoodDinner },
    snacks:    { tags: foodSnacks,    setter: setFoodSnacks },
  };

  function parseHours(v: string): number | null {
    const n = parseFloat(v);
    return isNaN(n) ? null : Math.min(Math.max(n, 0), 24);
  }

  function validate(requireAll = true): boolean {
    const errs: FormErrors = {};
    if (sleep !== "") {
      const s = parseFloat(sleep);
      if (isNaN(s) || s < 0 || s > 24) errs.sleep = "Sleep must be between 0 and 24 hours.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload(status: "draft" | "published") {
    return {
      profile_id:         profileId,
      caregiver_id:       caregiverId,
      last_edited_by:     caregiverId,
      status,
      day_rating:         dayRating,
      mood:               mood ?? null,
      sleep:              sleep ? parseFloat(sleep) : null,
      medications,
      notes:              notes.trim() || null,
      hours_school:       parseHours(hoursSchool),
      hours_outdoor:      parseHours(hoursOutdoor),
      hours_aba:          parseHours(hoursAba),
      hours_home:         parseHours(hoursHome),
      hours_screen:       parseHours(hoursScreen),
      outdoor_activities: outdoorActivities,
      food_breakfast:     foodBreakfast,
      food_lunch:         foodLunch,
      food_dinner:        foodDinner,
      food_snacks:        foodSnacks,
    };
  }

  async function saveDraft(e?: React.MouseEvent) {
    e?.preventDefault();
    if (!validate()) return;
    setSavingDraft(true);
    setErrors({});
    const supabase = getSupabase();

    let error;
    if (currentDraftId) {
      // Update existing draft
      ({ error } = await supabase.from("logs")
        .update(buildPayload("draft"))
        .eq("id", currentDraftId));
    } else {
      // Create new draft
      const { data, error: insertErr } = await supabase.from("logs")
        .insert(buildPayload("draft"))
        .select("id").single();
      error = insertErr;
      if (data) setCurrentDraftId(data.id);
    }

    if (error) { setErrors({ general: error.message }); }
    else {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    }
    setSavingDraft(false);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(true)) return;
    setLoading(true);
    setErrors({});
    const supabase = getSupabase();

    let error;
    if (currentDraftId) {
      ({ error } = await supabase.from("logs")
        .update(buildPayload("published"))
        .eq("id", currentDraftId));
    } else {
      ({ error } = await supabase.from("logs")
        .insert(buildPayload("published")));
    }

    if (error) { setErrors({ general: error.message }); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => { if (onSuccess) onSuccess(); else router.push("/dashboard"); }, 1000);
  }

  if (success) {
    return (
      <div className="p-10 text-center animate-fade-up" role="status" aria-live="polite">
        <div className="text-5xl mb-4" aria-hidden="true">🌿</div>
        <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
          Log saved!
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Redirecting to dashboard…</p>
      </div>
    );
  }

  const outdoorHours = parseHours(hoursOutdoor) ?? 0;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Daily care log entry" className="space-y-8">

      {/* Error banner */}
      {errors.general && (
        <p role="alert" className="text-sm rounded-lg p-3"
          style={{ background: "rgba(225,29,72,0.1)", color: "var(--color-danger)", border: "1px solid rgba(225,29,72,0.3)" }}>
          {errors.general}
        </p>
      )}

      {/* ══ 1. Overall Day ══════════════════════════════════════ */}
      <section aria-label="Overall day rating">
        <SectionHeader icon={<Smile size={16} />} title="How was the day overall?" />

        {/* Face buttons */}
        <fieldset>
          <legend className="sr-only">Overall day rating</legend>
          <div className="grid grid-cols-3 gap-3">
            {DAY_RATINGS.map(({ value, emoji, label, varBg, varBorder, varText }) => {
              const selected = dayRating === value;
              return (
                <button
                  key={value} type="button" role="radio" aria-checked={selected}
                  onClick={() => setDayRating(selected ? null : value)}
                  aria-label={`${label} day`}
                  className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-all duration-150"
                  style={{
                    background:  selected ? varBg  : "var(--color-bg-subtle)",
                    border:      `2px solid ${selected ? varBorder : "var(--color-border)"}`,
                    color:       selected ? varText : "var(--color-text-muted)",
                    transform:   selected ? "scale(1.04)" : "scale(1)",
                    boxShadow:   selected ? `0 4px 16px ${varBorder}` : "none",
                  }}
                >
                  <span className="text-4xl leading-none" aria-hidden="true">{emoji}</span>
                  <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Mood score bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="label mb-0 flex items-center gap-2">
              <Smile size={15} aria-hidden="true" style={{ color: "var(--color-accent)" }} />
              Mood score
            </p>
            <span className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
              {mood}/10 — {MOOD_LABELS[mood]}
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setMood(n)}
                className="flex-1 h-7 rounded transition-all"
                style={{
                  background: n <= mood
                    ? mood <= 3 ? "#ef4444" : mood <= 6 ? "#f59e0b" : "var(--color-accent)"
                    : "var(--color-border)",
                  transform: mood === n ? "scaleY(1.3)" : "scaleY(1)",
                }}
              />
            ))}
          </div>
          <input type="range" min={1} max={10} value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="sr-only" aria-label="Mood score"
            aria-valuenow={mood} aria-valuetext={`${mood} — ${MOOD_LABELS[mood]}`}
          />
        </div>

        {/* Sleep */}
        <div className="mt-5">
          <label htmlFor="sleep" className="label flex items-center gap-2">
            <Moon size={15} aria-hidden="true" style={{ color: "var(--color-accent)" }} />
            Sleep last night
          </label>
          <div className="flex items-center gap-2">
            <input
              id="sleep" type="number" min={0} max={24} step={0.5}
              value={sleep} onChange={(e) => setSleep(e.target.value)}
              placeholder="e.g. 8"
              className={clsx("input w-24", errors.sleep && "!border-red-400")}
              aria-describedby={errors.sleep ? "sleep-error" : undefined}
              aria-invalid={!!errors.sleep}
            />
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>hours</span>
          </div>
          {errors.sleep && (
            <p id="sleep-error" role="alert" className="text-sm mt-1" style={{ color: "var(--color-danger)" }}>
              {errors.sleep}
            </p>
          )}
        </div>
      </section>

      {/* ══ 2. Time Breakdown ═══════════════════════════════════ */}
      <section aria-label="Time breakdown">
        <SectionHeader
          icon={<Clock size={16} />}
          title="Time breakdown"
          subtitle="How many hours were spent in each setting?"
        />
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}
        >
          <HoursField id="hours-school"  label="At school"   icon={<School size={15} />}   value={hoursSchool}  onChange={setHoursSchool} />
          <div style={{ borderTop: "1px solid var(--color-border)" }} />
          <HoursField id="hours-outdoor" label="Outdoors"    icon={<TreePine size={15} />}  value={hoursOutdoor} onChange={setHoursOutdoor} />
          <div style={{ borderTop: "1px solid var(--color-border)" }} />
          <HoursField id="hours-aba"     label="ABA therapy" icon={<Smile size={15} />}     value={hoursAba}     onChange={setHoursAba} />
          <div style={{ borderTop: "1px solid var(--color-border)" }} />
          <HoursField id="hours-home"    label="At home"     icon={<Home size={15} />}      value={hoursHome}    onChange={setHoursHome} />
          <div style={{ borderTop: "1px solid var(--color-border)" }} />
          <HoursField id="hours-screen"  label="Screen time" icon={<Monitor size={15} />}   value={hoursScreen}  onChange={setHoursScreen} />
        </div>

        {/* Outdoor activities — only show when outdoor > 0 */}
        {outdoorHours > 0 && (
          <div
            className="mt-4 p-4 rounded-xl animate-fade-up"
            style={{
              background: "var(--color-accent-light)",
              border: "1px solid var(--color-border-strong)",
            }}
          >
            <SmartTagInput
              id="outdoor-activities"
              label="What did he do outside?"
              icon={<TreePine size={15} />}
              tags={outdoorActivities}
              onChange={setOutdoorActivities}
              profileId={profileId}
              category="outdoor_activity"
              placeholder="Playground, Bike ride, Walk…"
              tagColor={{
                bg:     "var(--color-accent-light)",
                text:   "var(--color-accent)",
                border: "var(--color-border-strong)",
              }}
            />
          </div>
        )}
      </section>

      {/* ══ 3. Medications ══════════════════════════════════════ */}
      <section aria-label="Medications">
        <SectionHeader icon={<Pill size={16} />} title="Medications taken today" />
        <SmartTagInput
          id="medications"
          label="Medications"
          icon={<Pill size={15} />}
          tags={medications}
          onChange={setMedications}
          profileId={profileId}
          category="medication"
          placeholder="Select or type a medication…"
          tagColor={{
            bg:     "var(--color-accent-light)",
            text:   "var(--color-accent)",
            border: "var(--color-border-strong)",
          }}
        />
      </section>

      {/* ══ 4. Food ═════════════════════════════════════════════ */}
      <section aria-label="Food and nutrition">
        <SectionHeader
          icon={<Utensils size={16} />}
          title="Food & nutrition"
          subtitle="What did he eat? Add as many items as needed per meal."
        />
        <div className="space-y-3">
          {FOOD_SECTIONS.map(({ key, label, placeholder, accent, border, tagBg, tagText, tagBorder }) => (
            <div
              key={key}
              className="p-4 rounded-xl"
              style={{ background: accent, border: `1px solid ${border}` }}
            >
              <SmartTagInput
                id={`food-${key}`}
                label={label}
                tags={foodState[key].tags}
                onChange={foodState[key].setter}
                profileId={profileId}
                category="food"
                placeholder={placeholder}
                tagColor={{ bg: tagBg, text: tagText, border: tagBorder }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══ 5. Notes ════════════════════════════════════════════ */}
      <section aria-label="Behavior notes">
        <SectionHeader
          icon={<FileText size={16} />}
          title="Behavior & event notes"
          subtitle="Optional — anything else notable today"
        />
        <textarea
          id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={4} className="input resize-y"
          placeholder="Any notable behaviors, triggers, wins, or concerns today…"
          maxLength={2000} aria-label="Behavior and event notes"
        />
        <p className="text-xs mt-1 text-right" style={{ color: "var(--color-text-subtle)" }}>
          {notes.length}/2000
        </p>
      </section>

      {/* ══ Submit bar ══════════════════════════════════════════ */}
      <div
        className="flex flex-wrap items-center gap-3 sticky bottom-0 py-4 px-6 -mx-6"
        style={{
          background:     "var(--color-surface)",
          borderTop:      "1px solid var(--color-border)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Publish */}
        <button type="submit" disabled={loading || savingDraft} className="btn-primary" aria-busy={loading}>
          {loading
            ? <><LoadingSpinner size={16} label="Publishing…" /> Publishing…</>
            : <><Send size={16} aria-hidden="true" /> {isEditing ? "Update & publish" : "Publish log"}</>
          }
        </button>

        {/* Save draft */}
        <button
          type="button"
          onClick={saveDraft}
          disabled={loading || savingDraft}
          className="btn-ghost"
          aria-busy={savingDraft}
        >
          {savingDraft
            ? <><LoadingSpinner size={16} label="Saving…" /> Saving draft…</>
            : <><Save size={16} aria-hidden="true" /> {isEditing ? "Save changes" : "Save as draft"}</>
          }
        </button>

        {/* Draft saved indicator */}
        {draftSaved && (
          <span className="text-sm flex items-center gap-1.5 animate-fade-in"
            style={{ color: "var(--color-accent)" }}>
            <Clock3 size={14} aria-hidden="true" /> Draft saved
          </span>
        )}

        <button type="button" onClick={() => router.push("/dashboard")} className="btn-ghost ml-auto">
          Cancel
        </button>
      </div>
    </form>
  );
}

"use client";
// components/SmartTagInput.tsx — fully theme-aware tag input

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

interface SmartTagInputProps {
  label: string;
  icon?: React.ReactNode;
  tags: string[];
  onChange: (tags: string[]) => void;
  profileId: string;
  category: "medication" | "food" | "outdoor_activity";
  placeholder?: string;
  tagColor?: { bg: string; text: string; border: string };
  id: string;
}

const SEED_SUGGESTIONS: Record<string, string[]> = {
  medication: [
    "Risperidone", "Aripiprazole", "Methylphenidate", "Amphetamine",
    "Sertraline", "Fluoxetine", "Clonidine", "Guanfacine",
    "Melatonin", "Lorazepam", "Valproate", "Lamotrigine",
  ],
  food: [
    "Oatmeal", "Eggs", "Toast", "Banana", "Apple", "Yogurt",
    "Chicken", "Rice", "Pasta", "Broccoli", "Carrots", "Sandwich",
    "Pizza", "Mac & Cheese", "Hot Dog", "Grilled Cheese",
    "Orange Juice", "Milk", "Water", "Crackers", "Fruit Cup",
    "Peanut Butter", "Granola Bar", "Cheese", "Soup",
  ],
  outdoor_activity: [
    "Playground", "Bike ride", "Walk", "Trampoline", "Swimming",
    "Park visit", "Nature walk", "Sports", "Scooter", "Sandbox",
    "Gardening", "Ball play", "Running", "Swing set",
  ],
};

export default function SmartTagInput({
  label, icon, tags, onChange, profileId, category,
  placeholder, tagColor, id,
}: SmartTagInputProps) {
  const [input,          setInput]          = useState("");
  const [suggestions,    setSuggestions]    = useState<string[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const loadSuggestions = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("tag_suggestions")
      .select("value, use_count")
      .eq("profile_id", profileId)
      .eq("category", category)
      .order("use_count", { ascending: false })
      .limit(50);

    const dbValues = (data ?? []).map((r: { value: string }) => r.value);
    const seeds    = SEED_SUGGESTIONS[category] ?? [];
    setAllSuggestions([...dbValues, ...seeds.filter((s) => !dbValues.includes(s))]);
  }, [profileId, category]);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  useEffect(() => {
    const q = input.toLowerCase().trim();
    const filtered = allSuggestions.filter(
      (s) => s.toLowerCase().includes(q) && !tags.includes(s)
    );
    setSuggestions(filtered.slice(0, 8));
  }, [input, allSuggestions, tags]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function persistSuggestion(value: string) {
    const supabase = getSupabase();
    await supabase.from("tag_suggestions").upsert(
      { profile_id: profileId, category, value, use_count: 1, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,category,value", ignoreDuplicates: false }
    );
    await loadSuggestions();
  }

  function addTag(value: string) {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput("");
    setDropdownOpen(false);
    persistSuggestion(trimmed);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) { onChange(tags.filter((t) => t !== tag)); }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter")     { e.preventDefault(); if (input.trim()) addTag(input); }
    if (e.key === "Escape")    { setDropdownOpen(false); }
    if (e.key === "Backspace" && !input && tags.length > 0) removeTag(tags[tags.length - 1]);
  }

  // Fallback tag style using CSS vars if no explicit tagColor given
  const tc = tagColor ?? {
    bg:     "var(--color-accent-light)",
    text:   "var(--color-accent)",
    border: "var(--color-border-strong)",
  };

  const showDropdown = dropdownOpen && (suggestions.length > 0 || input.trim().length > 0);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Label */}
      <p className="label flex items-center gap-2" id={`${id}-label`}>
        {icon && <span style={{ color: "var(--color-accent)" }} aria-hidden="true">{icon}</span>}
        {label}
      </p>

      {/* Tag container + input */}
      <div
        className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[46px] cursor-text"
        style={{
          background: "var(--color-surface)",
          border:     "1.5px solid var(--color-border)",
        }}
        onClick={() => { inputRef.current?.focus(); setDropdownOpen(true); }}
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {/* Tags */}
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            aria-label={`Remove ${tag}`}
            title={`Click to remove ${tag}`}
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-70 active:scale-95"
            style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}
          >
            {tag}
            <X size={12} aria-hidden="true" />
          </button>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? (placeholder ?? "Type or select…") : "Add more…"}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none py-0.5"
          style={{ color: "var(--color-text)" }}
          aria-label={`Add to ${label}`}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
          aria-controls={`${id}-listbox`}
        />

        {/* Chevron */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); inputRef.current?.focus(); }}
          aria-label="Show suggestions"
          className="ml-auto self-center p-1 rounded transition-colors"
          style={{ color: "var(--color-text-subtle)" }}
        >
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
          />
        </button>

        {/* Inline add button */}
        {input.trim() && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); addTag(input); }}
            aria-label={`Add "${input.trim()}"`}
            className="self-center p-1 rounded transition-colors"
            style={{ background: tc.bg, color: tc.text }}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden animate-fade-up"
          style={{
            background:  "var(--color-surface-raised)",
            border:      "1px solid var(--color-border)",
            boxShadow:   "0 8px 24px rgba(0,0,0,0.18)",
            maxHeight:   "220px",
            overflowY:   "auto",
          }}
        >
          {/* "Add custom" option */}
          {input.trim() && !suggestions.map(s => s.toLowerCase()).includes(input.trim().toLowerCase()) && (
            <button
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => addTag(input)}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
              style={{
                color:        "var(--color-accent)",
                fontWeight:   500,
                borderBottom: "1px solid var(--color-border)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-light)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={13} aria-hidden="true" />
              Add &ldquo;{input.trim()}&rdquo;
            </button>
          )}

          {/* Suggestion list */}
          {suggestions.length > 0
            ? suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={tags.includes(s)}
                  onClick={() => addTag(s)}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--color-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {s}
                </button>
              ))
            : !input.trim() && (
                <p className="px-4 py-3 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  No suggestions yet — type to add your own.
                </p>
              )
          }
        </div>
      )}

      <p className="text-xs mt-1.5" style={{ color: "var(--color-text-subtle)" }}>
        Click a tag to remove it · Press Enter or + to add custom items
      </p>
    </div>
  );
}

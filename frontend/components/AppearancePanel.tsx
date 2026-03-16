"use client";
// components/AppearancePanel.tsx — Settings modal for theme & dark mode

import { useTheme, COLOR_SCHEMES, type SchemeName } from "@/lib/theme";
import { X, Moon, Sun, Check, Palette } from "lucide-react";
import { useEffect, useRef } from "react";

interface AppearancePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AppearancePanel({ open, onClose }: AppearancePanelProps) {
  const { scheme, darkMode, tokens, setScheme, toggleDark } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap & close on Escape
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel container — centers the dialog in the viewport */}
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Appearance settings"
          className="animate-fade-up overflow-hidden pointer-events-auto"
          style={{
            width: "min(480px, calc(100vw - 32px))",
            maxHeight: "90dvh",
            overflowY: "auto",
            borderRadius: "20px",
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          }}
        >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0"
          style={{ background: tokens.surface, borderColor: tokens.border }}
        >
          <div className="flex items-center gap-2.5">
            <Palette size={18} aria-hidden="true" style={{ color: tokens.accent }} />
            <h2 className="font-display font-semibold text-base" style={{ color: tokens.text }}>
              Appearance
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close appearance settings"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: tokens.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.accentLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* ── Dark mode toggle ─────────────────────────────── */}
          <section aria-label="Dark mode">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: tokens.textSubtle }}>
              Display mode
            </p>
            <button
              type="button"
              onClick={toggleDark}
              aria-pressed={darkMode}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={{
                background: tokens.bgSubtle,
                border: `1.5px solid ${darkMode ? tokens.accent : tokens.border}`,
              }}
            >
              <div className="flex items-center gap-3">
                {darkMode
                  ? <Moon size={18} aria-hidden="true" style={{ color: tokens.accent }} />
                  : <Sun  size={18} aria-hidden="true" style={{ color: tokens.accent }} />
                }
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: tokens.text }}>
                    {darkMode ? "Dark mode" : "Light mode"}
                  </p>
                  <p className="text-xs" style={{ color: tokens.textMuted }}>
                    {darkMode ? "Using a dark color palette" : "Using a light color palette"}
                  </p>
                </div>
              </div>

              {/* Toggle pill */}
              <div
                className="relative w-11 h-6 rounded-full transition-all shrink-0"
                style={{ background: darkMode ? tokens.accent : tokens.border }}
                aria-hidden="true"
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm"
                  style={{
                    background: darkMode ? tokens.accentText : tokens.surface,
                    left: darkMode ? "calc(100% - 22px)" : "2px",
                  }}
                />
              </div>
            </button>
          </section>

          {/* ── Color scheme ─────────────────────────────────── */}
          <section aria-label="Color scheme">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: tokens.textSubtle }}>
              Color scheme
            </p>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Select color scheme">
              {COLOR_SCHEMES.map((cs) => {
                const active = scheme === cs.name;
                return (
                  <button
                    key={cs.name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setScheme(cs.name as SchemeName)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                    style={{
                      background:   active ? tokens.accentLight : tokens.bgSubtle,
                      border:       `1.5px solid ${active ? tokens.accent : tokens.border}`,
                      transform:    active ? "scale(1.02)" : "scale(1)",
                    }}
                    aria-label={`${cs.label} — ${cs.description}`}
                  >
                    {/* Color swatch */}
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
                      style={{ background: cs.swatch }}
                      aria-hidden="true"
                    >
                      {active && <Check size={14} color="white" strokeWidth={3} />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: tokens.text }}>
                        {cs.label}
                      </p>
                      <p className="text-xs truncate" style={{ color: tokens.textMuted }}>
                        {cs.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Live preview strip ───────────────────────────── */}
          <section aria-label="Live preview" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: tokens.textSubtle }}>
              Preview
            </p>
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: tokens.bg, border: `1px solid ${tokens.border}` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: tokens.accent }}>
                  <span aria-hidden="true" className="text-xs" style={{ color: tokens.accentText }}>W</span>
                </div>
                <span className="font-display font-semibold text-sm"
                  style={{ color: tokens.accent }}>Willow</span>
              </div>

              <div className="space-y-1.5">
                {["Dashboard", "New Log", "AI Insights"].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: i === 0 ? tokens.navActiveBg : "transparent",
                      color:      i === 0 ? tokens.navActiveText : tokens.textMuted,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: i === 0 ? tokens.navActive : tokens.border }} />
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: tokens.accent, color: tokens.accentText }}>
                  Save log
                </div>
                <div className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: tokens.accentLight, color: tokens.accent, border: `1px solid ${tokens.border}` }}>
                  Cancel
                </div>
              </div>
            </div>
          </section>

        </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-1">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tokens.accent,
                color: tokens.accentText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = tokens.accent)}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

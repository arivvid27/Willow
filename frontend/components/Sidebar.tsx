"use client";
// components/Sidebar.tsx — with theme-aware styling and Appearance button

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import {
  Leaf, LayoutDashboard, PlusCircle, Sparkles,
  MessageCircle, Settings, LogOut, Menu, X, Moon, Sun, UserCircle, Users,
} from "lucide-react";
import { useState } from "react";
import AppearancePanel from "./AppearancePanel";

const NAV_ITEMS = [
  { href: "/dashboard",          label: "Dashboard",       icon: LayoutDashboard },
  { href: "/dashboard/log",      label: "New Log",         icon: PlusCircle },
  { href: "/dashboard/insights", label: "AI Insights",     icon: Sparkles },
  { href: "/dashboard/chat",     label: "Chat with Willow",icon: MessageCircle },
  { href: "/dashboard/profile",  label: "Care Profile",    icon: UserCircle },
  { href: "/dashboard/settings", label: "Team & Invite",   icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { tokens, darkMode, toggleDark } = useTheme();

  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── Nav links (shared between desktop + mobile) ────────────
  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <nav aria-label="Main navigation">
      <ul className="space-y-0.5" role="list">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNav}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? tokens.navActiveBg  : "transparent",
                  color:      active ? tokens.navActiveText : tokens.textMuted,
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = tokens.accentLight;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  style={{ color: active ? tokens.navActive : tokens.textSubtle }}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  // ── Bottom action buttons (shared) ─────────────────────────
  const BottomActions = ({ onNav }: { onNav?: () => void }) => (
    <div className="space-y-0.5">
      {/* Appearance settings */}
      <button
        onClick={() => { setAppearanceOpen(true); onNav?.(); }}
        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{ color: tokens.textMuted }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = tokens.accentLight;
          e.currentTarget.style.color      = tokens.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color      = tokens.textMuted;
        }}
        aria-label="Open appearance settings"
      >
        <Settings size={17} aria-hidden="true" />
        Appearance
      </button>

      {/* Dark mode quick toggle */}
      <button
        onClick={toggleDark}
        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{ color: tokens.textMuted }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = tokens.accentLight;
          e.currentTarget.style.color      = tokens.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color      = tokens.textMuted;
        }}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={darkMode}
      >
        {darkMode
          ? <Sun  size={17} aria-hidden="true" />
          : <Moon size={17} aria-hidden="true" />
        }
        {darkMode ? "Light mode" : "Dark mode"}
      </button>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{ color: tokens.textMuted }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#fff1f2";
          e.currentTarget.style.color      = tokens.danger;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color      = tokens.textMuted;
        }}
        aria-label="Sign out of Willow"
      >
        <LogOut size={17} aria-hidden="true" />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-60 sticky top-0"
        style={{
          background:  tokens.surface,
          borderRight: `1px solid ${tokens.border}`,
          height:      "100dvh",
        }}
        aria-label="Site navigation"
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 py-5 border-b shrink-0"
          style={{ borderColor: tokens.border }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: tokens.accent }}
            aria-hidden="true"
          >
            <Leaf size={16} style={{ color: tokens.accentText }} />
          </div>
          <span className="font-display text-xl font-semibold" style={{ color: tokens.accent }}>
            Willow
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 py-5 overflow-y-auto">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3 px-3"
            style={{ color: tokens.textSubtle }}
          >
            Care Portal
          </p>
          <NavLinks />
        </div>

        {/* Bottom actions */}
        <div
          className="px-3 py-4 border-t shrink-0"
          style={{ borderColor: tokens.border }}
        >
          <BottomActions />
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────── */}
      <header
        className="lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-40"
        style={{ background: tokens.surface, borderColor: tokens.border }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: tokens.accent }}
          >
            <Leaf size={14} style={{ color: tokens.accentText }} />
          </div>
          <span className="font-display text-lg font-semibold" style={{ color: tokens.accent }}>
            Willow
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: tokens.textMuted }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="lg:hidden fixed inset-0 z-30 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            className="relative w-64 h-full flex flex-col shadow-xl animate-fade-up"
            style={{
              background:   tokens.surface,
              borderRight: `1px solid ${tokens.border}`,
            }}
          >
            <div
              className="px-4 py-5 border-b"
              style={{ borderColor: tokens.border }}
            >
              <p className="font-display text-lg font-semibold" style={{ color: tokens.accent }}>
                Menu
              </p>
            </div>
            <div className="flex-1 px-3 py-5 overflow-y-auto">
              <NavLinks onNav={() => setMobileOpen(false)} />
            </div>
            <div
              className="px-3 pb-6 pt-3 border-t"
              style={{ borderColor: tokens.border }}
            >
              <BottomActions onNav={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Appearance Panel (modal) ─────────────────────────── */}
      <AppearancePanel
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
      />
    </>
  );
}

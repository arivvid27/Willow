"use client";
// Sidebar.tsx — Collapsible sidebar with icon-only mode + profile switcher

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import {
  Leaf, LayoutDashboard, PlusCircle, Sparkles, MessageCircle,
  Settings, LogOut, Menu, X, Moon, Sun, UserCircle, Users,
  ChevronLeft, ChevronRight, MessagesSquare, ArrowLeftRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import AppearancePanel from "./AppearancePanel";

const NAV_ITEMS = [
  { href: "/dashboard",            label: "Dashboard",       icon: LayoutDashboard },
  { href: "/dashboard/log",        label: "New Log",         icon: PlusCircle },
  { href: "/dashboard/insights",   label: "AI Insights",     icon: Sparkles },
  { href: "/dashboard/chat",       label: "Chat with Willow",icon: MessageCircle },
  { href: "/dashboard/team-chat",  label: "Team Chat",       icon: MessagesSquare },
  { href: "/dashboard/profile",    label: "Care Profile",    icon: UserCircle },
  { href: "/dashboard/settings",   label: "Team & Invite",   icon: Users },
];

interface Profile { id: string; child_name: string; full_name?: string; }

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { tokens, darkMode, toggleDark } = useTheme();

  const [collapsed,      setCollapsed]      = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [profiles,       setProfiles]       = useState<Profile[]>([]);
  const [activeProfile,  setActiveProfile]  = useState<Profile | null>(null);
  const [switcherOpen,   setSwitcherOpen]   = useState(false);

  // Load all profiles the user has access to
  useEffect(() => {
    async function loadProfiles() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(id, child_name, full_name)")
        .eq("user_id", user.id);

      if (!data) return;
      const list: Profile[] = data.map((r: any) => ({
        id:         r.profiles.id,
        child_name: r.profiles.child_name,
        full_name:  r.profiles.full_name,
      }));
      setProfiles(list);

      // Restore saved active profile or default to first
      const saved = localStorage.getItem("willow:active_profile");
      const found = saved ? list.find((p) => p.id === saved) : null;
      setActiveProfile(found ?? list[0] ?? null);
    }
    loadProfiles();
  }, []);

  function switchProfile(p: Profile) {
    setActiveProfile(p);
    localStorage.setItem("willow:active_profile", p.id);
    setSwitcherOpen(false);
    router.push("/dashboard");
  }

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = activeProfile?.full_name || activeProfile?.child_name || "";

  // ── Tooltip for collapsed mode ─────────────────────────────
  const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="relative group/tip">
      {children}
      {collapsed && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-50
            opacity-0 group-hover/tip:opacity-100 transition-opacity"
          style={{ background: tokens.text, color: tokens.bg, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
        >
          {label}
        </div>
      )}
    </div>
  );

  // ── Nav links ──────────────────────────────────────────────
  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <nav aria-label="Main navigation">
      <ul className="space-y-0.5" role="list">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Tip label={label}>
                <Link
                  href={href}
                  onClick={onNav}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className="flex items-center rounded-lg text-sm font-medium transition-all"
                  style={{
                    gap:        collapsed ? 0 : "12px",
                    padding:    collapsed ? "10px" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: active ? tokens.navActiveBg  : "transparent",
                    color:      active ? tokens.navActiveText : tokens.textMuted,
                    fontWeight: active ? 600 : 500,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = tokens.accentLight; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={18} aria-hidden="true" style={{ color: active ? tokens.navActive : tokens.textSubtle, flexShrink: 0 }} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </Tip>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  // ── Bottom actions ─────────────────────────────────────────
  const BottomActions = ({ onNav }: { onNav?: () => void }) => (
    <div className="space-y-0.5">
      <Tip label="Appearance">
        <button
          onClick={() => { setAppearanceOpen(true); onNav?.(); }}
          className="flex w-full items-center rounded-lg text-sm font-medium transition-all"
          style={{ gap: collapsed ? 0 : "12px", padding: collapsed ? "10px" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", color: tokens.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accentLight; e.currentTarget.style.color = tokens.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = tokens.textMuted; }}
          aria-label="Appearance"
        >
          <Settings size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
          {!collapsed && "Appearance"}
        </button>
      </Tip>

      <Tip label={darkMode ? "Light mode" : "Dark mode"}>
        <button
          onClick={toggleDark}
          className="flex w-full items-center rounded-lg text-sm font-medium transition-all"
          style={{ gap: collapsed ? 0 : "12px", padding: collapsed ? "10px" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", color: tokens.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accentLight; e.currentTarget.style.color = tokens.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = tokens.textMuted; }}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={17} aria-hidden="true" style={{ flexShrink: 0 }} /> : <Moon size={17} aria-hidden="true" style={{ flexShrink: 0 }} />}
          {!collapsed && (darkMode ? "Light mode" : "Dark mode")}
        </button>
      </Tip>

      <Tip label="Sign out">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center rounded-lg text-sm font-medium transition-all"
          style={{ gap: collapsed ? 0 : "12px", padding: collapsed ? "10px" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", color: tokens.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = tokens.danger; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = tokens.textMuted; }}
          aria-label="Sign out"
        >
          <LogOut size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
          {!collapsed && "Sign out"}
        </button>
      </Tip>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col sticky top-0 shrink-0 transition-all duration-200"
        style={{
          width:       collapsed ? "64px" : "232px",
          background:  tokens.surface,
          borderRight: `1px solid ${tokens.border}`,
          height:      "100dvh",
          overflow:    "hidden",
        }}
        aria-label="Site navigation"
      >
        {/* Logo + collapse toggle */}
        <div
          className="flex items-center border-b shrink-0"
          style={{
            borderColor: tokens.border,
            padding:     collapsed ? "16px 0" : "16px 16px",
            justifyContent: collapsed ? "center" : "space-between",
            minHeight: "64px",
          }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: tokens.accent }} aria-hidden="true">
                <Leaf size={16} style={{ color: tokens.accentText }} />
              </div>
              <span className="font-display text-xl font-semibold truncate" style={{ color: tokens.accent }}>
                Willow
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: tokens.accent }} aria-hidden="true">
              <Leaf size={16} style={{ color: tokens.accentText }} />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: tokens.textSubtle }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accentLight; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Active profile chip */}
        {activeProfile && (
          <div
            className="shrink-0 border-b"
            style={{ borderColor: tokens.border, padding: collapsed ? "10px 8px" : "10px 12px" }}
          >
            <Tip label={`Switch profile — ${displayName}`}>
              <button
                onClick={() => profiles.length > 1 && setSwitcherOpen(true)}
                className="w-full rounded-lg transition-all flex items-center"
                style={{
                  gap:        collapsed ? 0 : "8px",
                  padding:    collapsed ? "6px" : "6px 8px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: tokens.bgSubtle,
                  border:     `1px solid ${tokens.border}`,
                  cursor:     profiles.length > 1 ? "pointer" : "default",
                }}
                onMouseEnter={(e) => { if (profiles.length > 1) e.currentTarget.style.background = tokens.accentLight; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = tokens.bgSubtle; }}
                aria-label="Switch profile"
                disabled={profiles.length <= 1}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: tokens.accent, color: tokens.accentText }}
                >
                  {displayName[0]?.toUpperCase() ?? "?"}
                </div>
                {!collapsed && (
                  <>
                    <span className="text-xs font-medium truncate flex-1 text-left" style={{ color: tokens.text }}>
                      {displayName}
                    </span>
                    {profiles.length > 1 && (
                      <ArrowLeftRight size={13} style={{ color: tokens.textSubtle, flexShrink: 0 }} aria-hidden="true" />
                    )}
                  </>
                )}
              </button>
            </Tip>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto" style={{ padding: collapsed ? "12px 8px" : "12px 8px" }}>
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-2"
              style={{ color: tokens.textSubtle }}>
              Care Portal
            </p>
          )}
          <NavLinks />
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="shrink-0 flex justify-center py-2 border-t" style={{ borderColor: tokens.border }}>
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: tokens.textSubtle }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accentLight; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Bottom actions */}
        <div className="shrink-0 border-t" style={{ borderColor: tokens.border, padding: collapsed ? "8px" : "8px" }}>
          <BottomActions />
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────── */}
      <header
        className="lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-40"
        style={{ background: tokens.surface, borderColor: tokens.border }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tokens.accent }}>
            <Leaf size={14} style={{ color: tokens.accentText }} />
          </div>
          <span className="font-display text-lg font-semibold" style={{ color: tokens.accent }}>Willow</span>
          {displayName && (
            <span className="text-sm ml-1" style={{ color: tokens.textMuted }}>· {displayName}</span>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg"
          style={{ color: tokens.textMuted }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative w-64 h-full flex flex-col shadow-xl"
            style={{ background: tokens.surface, borderRight: `1px solid ${tokens.border}` }}>

            {/* Profile switcher in mobile */}
            {activeProfile && (
              <div className="px-4 py-4 border-b" style={{ borderColor: tokens.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tokens.accent }}>
                    <Leaf size={14} style={{ color: tokens.accentText }} />
                  </div>
                  <span className="font-display text-lg font-semibold" style={{ color: tokens.accent }}>Willow</span>
                </div>
                {profiles.length > 1 && (
                  <button
                    onClick={() => { setSwitcherOpen(true); setMobileOpen(false); }}
                    className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                    style={{ background: tokens.bgSubtle, border: `1px solid ${tokens.border}`, color: tokens.text }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: tokens.accent, color: tokens.accentText }}>
                      {displayName[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 text-left truncate font-medium">{displayName}</span>
                    <ArrowLeftRight size={13} style={{ color: tokens.textSubtle }} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 px-2 py-4 overflow-y-auto">
              <NavLinks onNav={() => setMobileOpen(false)} />
            </div>
            <div className="px-2 pb-6 pt-3 border-t" style={{ borderColor: tokens.border }}>
              <BottomActions onNav={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Switcher Modal ───────────────────────────── */}
      {switcherOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setSwitcherOpen(false)} aria-hidden="true" />
          <div
            className="fixed z-50 animate-fade-up rounded-2xl overflow-hidden"
            style={{
              top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(380px, calc(100vw - 32px))",
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            }}
            role="dialog" aria-modal="true" aria-label="Switch care profile"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: tokens.border }}>
              <h2 className="font-display font-semibold" style={{ color: tokens.text }}>Switch profile</h2>
              <button onClick={() => setSwitcherOpen(false)} style={{ color: tokens.textSubtle }}
                className="p-1.5 rounded-lg transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = tokens.bgSubtle; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
              {profiles.map((p) => {
                const name   = p.full_name || p.child_name;
                const active = activeProfile?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => switchProfile(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background:   active ? tokens.navActiveBg : "transparent",
                      border:       `1.5px solid ${active ? tokens.accent : tokens.border}`,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = tokens.bgSubtle; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: active ? tokens.accent : tokens.accentLight, color: active ? tokens.accentText : tokens.accent }}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: tokens.text }}>{name}</p>
                    </div>
                    {active && <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: tokens.accent, color: tokens.accentText }}>Active</span>}
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t" style={{ borderColor: tokens.border }}>
              <button
                onClick={() => { setSwitcherOpen(false); router.push("/dashboard/settings"); }}
                className="w-full text-sm text-center py-2"
                style={{ color: tokens.accent }}
              >
                + Join another profile with an invite code
              </button>
            </div>
          </div>
        </>
      )}

      <AppearancePanel open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </>
  );
}

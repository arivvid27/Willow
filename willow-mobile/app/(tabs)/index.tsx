// app/(tabs)/index.tsx — Dashboard screen

import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { analyzeLogs } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import type { Log, Profile } from "@/lib/types";

// ── Mood badge ────────────────────────────────────────────────

function MoodBadge({ mood }: { mood: number }) {
  const config =
    mood >= 8 ? { emoji: "😊", label: "Great",  bg: "rgba(34,197,94,0.15)",  color: "#22c55e" } :
    mood >= 6 ? { emoji: "🙂", label: "Good",   bg: "rgba(234,179,8,0.15)",  color: "#eab308" } :
    mood >= 4 ? { emoji: "😐", label: "Fair",   bg: "rgba(249,115,22,0.15)", color: "#f97316" } :
    mood >= 2 ? { emoji: "😟", label: "Low",    bg: "rgba(239,68,68,0.15)",  color: "#ef4444" } :
               { emoji: "😢", label: "Hard",   bg: "rgba(168,85,247,0.15)", color: "#a855f7" };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: config.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
      <Text style={{ fontSize: 14 }}>{config.emoji}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: config.color }}>{mood}/10 · {config.label}</Text>
    </View>
  );
}

// ── Log card ──────────────────────────────────────────────────

function LogCard({ log, tokens, onDelete }: { log: Log; tokens: any; onDelete: (id: string) => void }) {
  const DAY_EMOJI: Record<string, string> = { good: "😊", neutral: "😐", bad: "😔" };
  const emoji = log.day_rating ? DAY_EMOJI[log.day_rating] : null;

  function confirmDelete() {
    Alert.alert(
      "Delete this log?",
      "This log entry will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(log.id) },
      ]
    );
  }

  return (
    <View style={[ls.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      {/* Header */}
      <View style={ls.cardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          {emoji && <Text style={{ fontSize: 22 }}>{emoji}</Text>}
          <MoodBadge mood={log.mood} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 12, color: tokens.textSubtle }}>
            {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
          <TouchableOpacity
            onPress={confirmDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[ls.deleteBtn, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border }]}
            accessibilityRole="button"
            accessibilityLabel="Delete log"
          >
            <Ionicons name="trash-outline" size={15} color={tokens.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row */}
      <View style={ls.statsRow}>
        {log.sleep != null && (
          <View style={ls.statChip}>
            <Ionicons name="moon-outline" size={13} color={tokens.accent} />
            <Text style={[ls.statText, { color: tokens.textMuted }]}>{log.sleep}h sleep</Text>
          </View>
        )}
        {(log.medications ?? []).length > 0 && (
          <View style={ls.statChip}>
            <Ionicons name="medical-outline" size={13} color={tokens.accent} />
            <Text style={[ls.statText, { color: tokens.textMuted }]} numberOfLines={1}>
              {(log.medications ?? []).join(", ")}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {log.notes && (
        <View style={[ls.notesBox, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border }]}>
          <Ionicons name="document-text-outline" size={13} color={tokens.textSubtle} style={{ marginTop: 2 }} />
          <Text style={[ls.notesText, { color: tokens.text }]}>{log.notes}</Text>
        </View>
      )}
    </View>
  );
}

const ls = StyleSheet.create({
  card:       { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  deleteBtn:  { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statsRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  statChip:   { flexDirection: "row", alignItems: "center", gap: 4 },
  statText:   { fontSize: 13 },
  notesBox:   { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  notesText:  { fontSize: 13, flex: 1, lineHeight: 18 },
});

// ── AI Summary card ───────────────────────────────────────────

function AISummaryCard({ profileName, logs, tokens }: { profileName: string; logs: Log[]; tokens: any }) {
  const [summary,   setSummary]   = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fetchedFor = useRef("");

  const key = `${profileName}-${logs.length}`;

  useEffect(() => {
    if (logs.length < 3 || fetchedFor.current === key || dismissed) return;
    let cancelled = false;
    fetchedFor.current = key;
    setLoading(true);
    analyzeLogs(profileName, logs)
      .then((r) => { if (!cancelled) { setSummary(r.summary); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, logs, profileName, dismissed]);

  if (dismissed || logs.length < 3) return null;

  return (
    <View style={[as.card, { backgroundColor: tokens.surface, borderColor: tokens.accent }]}>
      <View style={as.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={[as.icon, { backgroundColor: tokens.accent }]}>
            <Ionicons name="sparkles" size={14} color={tokens.accentText} />
          </View>
          <View>
            <Text style={[as.title, { color: tokens.text }]}>Willow's take on {profileName}'s week</Text>
            <Text style={[as.sub, { color: tokens.textSubtle }]}>Based on last {Math.min(logs.length, 7)} logs</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss summary"
        >
          <Ionicons name="close" size={18} color={tokens.textSubtle} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={[as.body, { color: tokens.textMuted }]}>Reviewing the week…</Text>
        </View>
      )}
      {summary && !loading && (
        <Text style={[as.body, { color: tokens.textMuted }]}>{summary}</Text>
      )}

      <View style={[as.footer, { borderTopColor: tokens.border }]}>
        <Text style={[as.footerText, { color: tokens.textSubtle }]}>
          AI summaries are supportive only — always consult qualified professionals.
        </Text>
      </View>
    </View>
  );
}

const as = StyleSheet.create({
  card:       { borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header:     { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  icon:       { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 14, fontWeight: "600" },
  sub:        { fontSize: 12, marginTop: 1 },
  body:       { fontSize: 14, lineHeight: 21 },
  footer:     { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  footerText: { fontSize: 11, lineHeight: 16 },
});

// ── Main dashboard ────────────────────────────────────────────

export default function DashboardScreen() {
  const { tokens } = useTheme();
  const router     = useRouter();

  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [logs,        setLogs]        = useState<Log[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/(auth)/login"); return; }

    const { data: access } = await supabase
      .from("caregiver_access").select("profile_id").eq("user_id", user.id).limit(1).single();
    if (!access) { setError("No profile found."); setLoading(false); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", access.profile_id).single();
    if (prof) setProfile(prof);

    const { data: logsData } = await supabase
      .from("logs").select("*")
      .eq("profile_id", access.profile_id)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs(logsData ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const last7    = logs.slice(0, 7);
  const avgMood  = last7.length ? (last7.reduce((s, l) => s + l.mood, 0) / last7.length).toFixed(1) : "—";
  const avgSleep = last7.length ? (last7.reduce((s, l) => s + (l.sleep ?? 0), 0) / last7.length).toFixed(1) : "—";

  const s = ds(tokens);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: tokens.border, backgroundColor: tokens.surface }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[s.logoBox, { backgroundColor: tokens.accent }]}>
            <Ionicons name="leaf" size={16} color={tokens.accentText} />
          </View>
          <View>
            <Text style={[s.headerTitle, { color: tokens.text }]}>
              {profile?.child_name ? `${profile.child_name}'s Dashboard` : "Dashboard"}
            </Text>
            <Text style={[s.headerSub, { color: tokens.textSubtle }]}>Real-time care log feed</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.newLogBtn, { backgroundColor: tokens.accent }]}
          onPress={() => router.push("/(tabs)/log")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="New log"
        >
          <Ionicons name="add" size={20} color={tokens.accentText} />
          <Text style={[s.newLogText, { color: tokens.accentText }]}>New Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        {last7.length > 0 && (
          <View style={s.statsRow}>
            {[
              { label: "This week", value: String(last7.length), icon: "bar-chart-outline", unit: "" },
              { label: "Avg mood",  value: avgMood,  icon: "happy-outline",  unit: "/10" },
              { label: "Avg sleep", value: avgSleep, icon: "moon-outline",   unit: "h" },
            ].map(({ label, value, icon, unit }) => (
              <View key={label} style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Ionicons name={icon as any} size={18} color={tokens.accent} />
                <Text style={[s.statValue, { color: tokens.text }]}>
                  {value}<Text style={[s.statUnit, { color: tokens.textMuted }]}>{unit}</Text>
                </Text>
                <Text style={[s.statLabel, { color: tokens.textSubtle }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI summary */}
        {profile && logs.length >= 3 && (
          <AISummaryCard profileName={profile.child_name} logs={logs} tokens={tokens} />
        )}

        {/* Log feed */}
        <Text style={[s.sectionTitle, { color: tokens.text }]}>Recent Logs</Text>

        {error && (
          <View style={[s.errorBox, { borderColor: tokens.danger }]}>
            <Text style={{ color: tokens.danger, fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {logs.length === 0 ? (
          <View style={[s.empty, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={[s.emptyTitle, { color: tokens.text }]}>No logs yet</Text>
            <Text style={[s.emptySub, { color: tokens.textMuted }]}>
              Start tracking {profile?.child_name ?? "your care recipient"}'s daily wellbeing.
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: tokens.accent }]}
              onPress={() => router.push("/(tabs)/log")}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={tokens.accentText} />
              <Text style={{ color: tokens.accentText, fontWeight: "600", fontSize: 15 }}>Add first log</Text>
            </TouchableOpacity>
          </View>
        ) : (
          logs.map((log) => (
            <LogCard key={log.id} log={log} tokens={tokens} onDelete={handleDelete} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ds = (t: any) => StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  logoBox:     { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerSub:   { fontSize: 12, marginTop: 1 },
  newLogBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minHeight: 40 },
  newLogText:  { fontWeight: "600", fontSize: 14 },
  scroll:      { padding: 16, paddingBottom: 32 },
  statsRow:    { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard:    { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  statValue:   { fontSize: 20, fontWeight: "700" },
  statUnit:    { fontSize: 13, fontWeight: "400" },
  statLabel:   { fontSize: 11, textAlign: "center" },
  sectionTitle:{ fontSize: 16, fontWeight: "600", marginBottom: 12, marginTop: 8 },
  errorBox:    { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  empty:       { borderRadius: 16, padding: 32, alignItems: "center", borderWidth: 1 },
  emptyTitle:  { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySub:    { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  emptyBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
});

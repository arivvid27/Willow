// app/(tabs)/insights.tsx — AI Insights screen

import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { supabase } from "@/lib/supabase";
import { analyzeLogs } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import type { Log } from "@/lib/types";

type Section = "summary" | "pattern_analysis" | "suggested_adjustments";

const SECTIONS: { key: Section; label: string; emoji: string }[] = [
  { key: "summary",               label: "Overview",             emoji: "📋" },
  { key: "pattern_analysis",      label: "Pattern Analysis",     emoji: "🔍" },
  { key: "suggested_adjustments", label: "Suggested Adjustments",emoji: "💡" },
];

export default function InsightsScreen() {
  const { tokens } = useTheme();

  const [profileName, setProfileName] = useState("");
  const [logs,        setLogs]        = useState<Log[]>([]);
  const [result,      setResult]      = useState<Record<Section, string> | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [expanded,    setExpanded]    = useState<Section | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: access } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(child_name)")
        .eq("user_id", user.id).limit(1).single();
      if (!access) { setInitLoading(false); return; }

      const pName = (access as any).profiles?.child_name ?? "Unknown";
      const pId   = access.profile_id;
      setProfileName(pName);

      const sevenAgo = new Date();
      sevenAgo.setDate(sevenAgo.getDate() - 7);

      const { data: logsData } = await supabase
        .from("logs").select("*")
        .eq("profile_id", pId)
        .gte("created_at", sevenAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(7);

      setLogs(logsData ?? []);
      setInitLoading(false);
    }
    init();
  }, []);

  async function runAnalysis() {
    if (logs.length === 0) { setError("No logs in the last 7 days to analyze."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await analyzeLogs(profileName, logs);
      setResult(data as any);
      setExpanded("summary");
    } catch {
      setError("Analysis failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const s = styles(tokens);

  if (initLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      <View style={[s.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <Text style={[s.title, { color: tokens.text }]}>AI Care Insights</Text>
        <Text style={[s.sub, { color: tokens.textSubtle }]}>
          Last 7 days for {profileName} · {logs.length} log{logs.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Trigger card */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.accent, borderLeftWidth: 4 }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <View style={[s.iconBox, { backgroundColor: tokens.accent }]}>
              <Ionicons name="sparkles" size={18} color={tokens.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: tokens.text }]}>AI Care Insights</Text>
              <Text style={[s.cardSub, { color: tokens.textMuted }]}>
                Willow's AI — guided by BCBA principles — will analyze{" "}
                <Text style={{ fontWeight: "600" }}>{logs.length}</Text> recent logs for{" "}
                <Text style={{ fontWeight: "600" }}>{profileName}</Text> and surface trends and suggestions.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={[s.analyzeBtn, { backgroundColor: tokens.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={runAnalysis}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Run analysis"
            >
              {loading ? <ActivityIndicator color={tokens.accentText} size="small" /> : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color={tokens.accentText} />
                  <Text style={[s.analyzeBtnText, { color: tokens.accentText }]}>
                    {result ? "Re-analyze" : "Analyze last 7 logs"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {result && !loading && (
              <TouchableOpacity
                style={[s.refreshBtn, { borderColor: tokens.border }]}
                onPress={runAnalysis}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={tokens.textMuted} />
                <Text style={{ color: tokens.textMuted, fontSize: 14, fontWeight: "500" }}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[s.disclaimer, { color: tokens.textSubtle }]}>
            ⚠️ AI insights are supportive tools only — always consult qualified medical professionals.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={[s.errorBox, { borderColor: tokens.danger }]}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={{ color: tokens.danger, fontSize: 14, flex: 1 }}>{error}</Text>
          </View>
        )}

        {/* Loading shimmer */}
        {loading && (
          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border, gap: 10 }]}>
            {[0.9, 0.75, 0.6].map((w, i) => (
              <View key={i} style={[s.shimmer, { backgroundColor: tokens.border, width: `${w * 100}%` as any }]} />
            ))}
            <Text style={{ color: tokens.textSubtle, fontSize: 13 }}>Reviewing {logs.length} logs…</Text>
          </View>
        )}

        {/* Accordion results */}
        {result && !loading && SECTIONS.map(({ key, label, emoji }) => {
          const isOpen  = expanded === key;
          const content = result[key];
          if (!content) return null;
          return (
            <View key={key} style={[s.accordionCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <TouchableOpacity
                style={s.accordionHeader}
                onPress={() => setExpanded(isOpen ? null : key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={label}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: tokens.text }}>
                  {emoji}  {label}
                </Text>
                <Ionicons
                  name={isOpen ? "chevron-up-outline" : "chevron-down-outline"}
                  size={18}
                  color={tokens.textSubtle}
                />
              </TouchableOpacity>
              {isOpen && (
                <View style={[s.accordionBody, { borderTopColor: tokens.border }]}>
                  {key === "summary" ? (
                    <Text style={{ color: tokens.textMuted, fontSize: 14, lineHeight: 22 }}>{content}</Text>
                  ) : (
                    <Markdown
                      style={{
                        body:       { color: tokens.text,      fontSize: 14, lineHeight: 22 },
                        heading2:   { color: tokens.accent,    fontSize: 15, fontWeight: "700", marginTop: 12 },
                        bullet_list:{ paddingLeft: 4 },
                        list_item:  { marginBottom: 4 },
                        strong:     { fontWeight: "700" },
                      }}
                    >
                      {content}
                    </Markdown>
                  )}
                </View>
              )}
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: any) => StyleSheet.create({
  safe:            { flex: 1 },
  header:          { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title:           { fontSize: 20, fontWeight: "700" },
  sub:             { fontSize: 13, marginTop: 2 },
  scroll:          { padding: 16, paddingBottom: 40 },
  card:            { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  iconBox:         { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle:       { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardSub:         { fontSize: 13, lineHeight: 20 },
  analyzeBtn:      { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
  analyzeBtnText:  { fontWeight: "600", fontSize: 14 },
  refreshBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  disclaimer:      { fontSize: 11, lineHeight: 16, marginTop: 12 },
  errorBox:        { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  shimmer:         { height: 14, borderRadius: 8 },
  accordionCard:   { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  accordionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, minHeight: 54 },
  accordionBody:   { padding: 16, paddingTop: 12, borderTopWidth: 1 },
});

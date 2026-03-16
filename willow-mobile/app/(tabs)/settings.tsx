// app/(tabs)/settings.tsx — Settings & Appearance screen

import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { SCHEME_LIST, type SchemeName } from "@/lib/theme";

export default function SettingsScreen() {
  const { tokens, scheme, darkMode, setScheme, toggleDark } = useTheme();
  const router = useRouter();

  async function handleSignOut() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  }

  const s = styles(tokens);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <Text style={[s.title, { color: tokens.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Dark mode ── */}
        <Text style={[s.sectionLabel, { color: tokens.textSubtle }]}>DISPLAY MODE</Text>
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <TouchableOpacity
            style={s.row}
            onPress={toggleDark}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityState={{ checked: darkMode }}
            accessibilityLabel={darkMode ? "Dark mode enabled" : "Dark mode disabled"}
          >
            <View style={[s.rowIcon, { backgroundColor: tokens.accentLight }]}>
              <Ionicons name={darkMode ? "moon" : "sunny"} size={18} color={tokens.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: tokens.text }]}>{darkMode ? "Dark mode" : "Light mode"}</Text>
              <Text style={[s.rowSub, { color: tokens.textSubtle }]}>
                {darkMode ? "Using a dark color palette" : "Using a light color palette"}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDark}
              trackColor={{ false: tokens.border, true: tokens.accent }}
              thumbColor={tokens.surface}
              accessibilityLabel="Toggle dark mode"
            />
          </TouchableOpacity>
        </View>

        {/* ── Color scheme ── */}
        <Text style={[s.sectionLabel, { color: tokens.textSubtle }]}>COLOR SCHEME</Text>
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {SCHEME_LIST.map(({ name, label, description, swatch }, idx) => {
            const active = scheme === name;
            const isLast = idx === SCHEME_LIST.length - 1;
            return (
              <TouchableOpacity
                key={name}
                style={[
                  s.schemeRow,
                  active && { backgroundColor: tokens.accentLight },
                  !isLast && { borderBottomWidth: 1, borderBottomColor: tokens.border },
                ]}
                onPress={() => setScheme(name as SchemeName)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${label} color scheme`}
              >
                {/* Swatch */}
                <View style={[s.swatch, { backgroundColor: swatch }]}>
                  {active && <Ionicons name="checkmark" size={15} color="white" />}
                </View>
                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: tokens.text }]}>{label}</Text>
                  <Text style={[s.rowSub, { color: tokens.textSubtle }]}>{description}</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={tokens.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Live preview ── */}
        <Text style={[s.sectionLabel, { color: tokens.textSubtle }]}>PREVIEW</Text>
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border, padding: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={[{ width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.accent }]}>
              <Ionicons name="leaf" size={15} color={tokens.accentText} />
            </View>
            <Text style={{ fontWeight: "700", fontSize: 16, color: tokens.accent }}>Willow</Text>
          </View>
          {["Dashboard", "New Log", "AI Insights"].map((item, i) => (
            <View
              key={item}
              style={[s.previewRow, {
                backgroundColor: i === 0 ? tokens.navActiveBg : "transparent",
                borderRadius: 8,
              }]}
            >
              <View style={[{ width: 10, height: 10, borderRadius: 3, backgroundColor: i === 0 ? tokens.navActive : tokens.border }]} />
              <Text style={{ fontSize: 13, fontWeight: i === 0 ? "600" : "400", color: i === 0 ? tokens.navActiveText : tokens.textMuted }}>{item}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tokens.accent }]}>
              <Text style={{ color: tokens.accentText, fontSize: 13, fontWeight: "600" }}>Save log</Text>
            </View>
            <View style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tokens.accentLight, borderWidth: 1, borderColor: tokens.border }]}>
              <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: "500" }}>Cancel</Text>
            </View>
          </View>
        </View>

        {/* ── Account ── */}
        <Text style={[s.sectionLabel, { color: tokens.textSubtle }]}>ACCOUNT</Text>
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <TouchableOpacity
            style={s.row}
            onPress={handleSignOut}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <View style={[s.rowIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
              <Ionicons name="log-out-outline" size={18} color={tokens.danger} />
            </View>
            <Text style={[s.rowTitle, { color: tokens.danger }]}>Sign out</Text>
            <Ionicons name="chevron-forward" size={16} color={tokens.textSubtle} />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[s.version, { color: tokens.textSubtle }]}>Willow v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: any) => StyleSheet.create({
  safe:         { flex: 1 },
  header:       { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title:        { fontSize: 20, fontWeight: "700" },
  scroll:       { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8, marginTop: 12, marginLeft: 4 },
  card:         { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 4, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  row:          { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, minHeight: 64 },
  rowIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle:     { fontSize: 15, fontWeight: "500" },
  rowSub:       { fontSize: 12, marginTop: 1 },
  schemeRow:    { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, minHeight: 60 },
  swatch:       { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  previewRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 7 },
  version:      { textAlign: "center", fontSize: 12, marginTop: 24 },
});

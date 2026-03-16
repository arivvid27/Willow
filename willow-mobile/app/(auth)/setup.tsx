// app/(auth)/setup.tsx — Profile setup for new Google OAuth users

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";

export default function SetupScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  const [childName, setChildName] = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  async function handleSetup() {
    if (!childName.trim()) {
      setError("Please enter a name.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      router.replace("/(auth)/login");
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .insert({ child_name: childName.trim(), created_by: user.id })
      .select()
      .single();

    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    await supabase.from("caregiver_access").insert({
      profile_id: profile.id,
      user_id:    user.id,
      role:       "owner",
    });

    router.replace("/(tabs)");
  }

  const s = styles(tokens);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoRow}>
            <View style={[s.logoBox, { backgroundColor: tokens.accent }]}>
              <Ionicons name="leaf" size={22} color={tokens.accentText} />
            </View>
            <Text style={[s.logoText, { color: tokens.accent }]}>Willow</Text>
          </View>

          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.title, { color: tokens.text }]}>One last thing 🌿</Text>
            <Text style={[s.subtitle, { color: tokens.textMuted }]}>
              Who are you coordinating care for?
            </Text>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: tokens.text }]}>Care recipient's name</Text>
              <TextInput
                style={[s.input, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
                placeholder="e.g. Jamie"
                placeholderTextColor={tokens.textSubtle}
                value={childName}
                onChangeText={setChildName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSetup}
                accessibilityLabel="Care recipient name"
              />
              <Text style={[s.hint, { color: tokens.textSubtle }]}>
                The person whose care you are coordinating.
              </Text>
            </View>

            {error && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={tokens.danger} />
                <Text style={[s.errorText, { color: tokens.danger }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, { backgroundColor: tokens.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={handleSetup}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Get started"
            >
              {loading
                ? <ActivityIndicator color={tokens.accentText} />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={tokens.accentText} />
                    <Text style={[s.btnText, { color: tokens.accentText }]}>Get started</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: any) => StyleSheet.create({
  safe:       { flex: 1 },
  scroll:     { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logoBox:    { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoText:   { fontSize: 26, fontWeight: "700" },
  card:       { borderRadius: 20, padding: 24, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  title:      { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle:   { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  fieldGroup: { marginBottom: 16 },
  label:      { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  input:      { borderWidth: 1.5, borderRadius: 8, padding: 13, fontSize: 16, minHeight: 48 },
  hint:       { fontSize: 12, marginTop: 4 },
  errorBox:   { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", marginBottom: 12 },
  errorText:  { fontSize: 13, flex: 1 },
  btn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 10, marginTop: 8 },
  btnText:    { fontSize: 16, fontWeight: "600" },
});

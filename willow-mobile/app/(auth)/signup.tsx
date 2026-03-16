// app/(auth)/signup.tsx — Willow mobile signup screen

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import GoogleButton from "@/components/GoogleButton";
import { useTheme } from "@/lib/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  const [childName, setChildName] = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  async function handleSignup() {
    if (!childName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) {
      setError(authError?.message ?? "Signup failed");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .insert({ child_name: childName.trim(), created_by: userId })
      .select()
      .single();

    if (profileErr) { setError(profileErr.message); setLoading(false); return; }

    await supabase.from("caregiver_access").insert({
      profile_id: profile.id, user_id: userId, role: "owner",
    });

    setDone(true);
    setLoading(false);
  }

  const s = styles(tokens);

  if (done) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
        <View style={s.doneContainer}>
          <Text style={s.doneEmoji}>🌿</Text>
          <Text style={[s.title, { color: tokens.text, textAlign: "center" }]}>Check your email</Text>
          <Text style={[s.subtitle, { color: tokens.textMuted, textAlign: "center" }]}>
            We sent a confirmation link to {email}.{"\n"}Confirm it then sign in.
          </Text>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: tokens.accent }]}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={[s.btnText, { color: tokens.accentText }]}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoRow}>
            <View style={[s.logoBox, { backgroundColor: tokens.accent }]}>
              <Ionicons name="leaf" size={22} color={tokens.accentText} />
            </View>
            <Text style={[s.logoText, { color: tokens.accent }]}>Willow</Text>
          </View>

          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.title, { color: tokens.text }]}>Create your account</Text>
            <Text style={[s.subtitle, { color: tokens.textMuted }]}>Start coordinating care in minutes.</Text>

            {/* Google OAuth - note: Google users go to /setup for child name */}
            <GoogleButton label="Sign up with Google" />

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
              <Text style={{ fontSize: 12, color: tokens.textSubtle, fontWeight: "500" }}>or sign up with email</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: tokens.text }]}>Care recipient's name</Text>
              <TextInput
                style={[s.input, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
                placeholder="e.g. Jamie"
                placeholderTextColor={tokens.textSubtle}
                value={childName}
                onChangeText={setChildName}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Care recipient name"
              />
              <Text style={[s.hint, { color: tokens.textSubtle }]}>The person whose care you are coordinating.</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: tokens.text }]}>Email address</Text>
              <TextInput
                style={[s.input, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
                placeholder="you@example.com"
                placeholderTextColor={tokens.textSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                accessibilityLabel="Email address"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: tokens.text }]}>Password</Text>
              <TextInput
                style={[s.input, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
                placeholder="At least 8 characters"
                placeholderTextColor={tokens.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                accessibilityLabel="Password"
              />
            </View>

            {error && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={tokens.danger} />
                <Text style={[s.errorText, { color: tokens.danger }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, { backgroundColor: tokens.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading
                ? <ActivityIndicator color={tokens.accentText} />
                : <>
                    <Ionicons name="person-add-outline" size={18} color={tokens.accentText} />
                    <Text style={[s.btnText, { color: tokens.accentText }]}>Create account</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: tokens.textMuted }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={[s.footerLink, { color: tokens.accent }]}>Sign in</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof useTheme>["tokens"]) => StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flexGrow: 1, justifyContent: "center", padding: 24 },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  doneEmoji:     { fontSize: 56 },
  logoRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logoBox:       { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoText:      { fontSize: 26, fontWeight: "700" },
  card:          { borderRadius: 20, padding: 24, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  title:         { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle:      { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  fieldGroup:    { marginBottom: 16 },
  label:         { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  input:         { borderWidth: 1.5, borderRadius: 8, padding: 13, fontSize: 16, minHeight: 48 },
  hint:          { fontSize: 12, marginTop: 4 },
  errorBox:      { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", marginBottom: 12 },
  errorText:     { fontSize: 13, flex: 1 },
  btn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 10, marginTop: 8 },
  btnText:       { fontSize: 16, fontWeight: "600" },
  footer:        { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText:    { fontSize: 14 },
  footerLink:    { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});

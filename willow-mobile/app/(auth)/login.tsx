// app/(auth)/login.tsx — Willow mobile login screen

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

export default function LoginScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace("/(tabs)");
    }
  }

  const s = styles(tokens);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={[s.logoBox, { backgroundColor: tokens.accent }]}>
              <Ionicons name="leaf" size={22} color={tokens.accentText} />
            </View>
            <Text style={[s.logoText, { color: tokens.accent }]}>Willow</Text>
          </View>

          {/* Card */}
          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.title, { color: tokens.text }]}>Welcome back</Text>
            <Text style={[s.subtitle, { color: tokens.textMuted }]}>
              Sign in to your care team account
            </Text>

            {/* Google OAuth */}
            <GoogleButton label="Sign in with Google" />

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
              <Text style={{ fontSize: 12, color: tokens.textSubtle, fontWeight: "500" }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
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
                autoComplete="email"
                returnKeyType="next"
                accessibilityLabel="Email address"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: tokens.text }]}>Password</Text>
              <TextInput
                style={[s.input, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
                placeholder="••••••••"
                placeholderTextColor={tokens.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading
                ? <ActivityIndicator color={tokens.accentText} />
                : <>
                    <Ionicons name="log-in-outline" size={18} color={tokens.accentText} />
                    <Text style={[s.btnText, { color: tokens.accentText }]}>Sign in</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: tokens.textMuted }]}>New to Willow? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")} activeOpacity={0.7}>
              <Text style={[s.footerLink, { color: tokens.accent }]}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof useTheme>["tokens"]) => StyleSheet.create({
  safe:      { flex: 1 },
  scroll:    { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logoBox:   { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoText:  { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  card:      { borderRadius: 20, padding: 24, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  title:     { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle:  { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  fieldGroup:{ marginBottom: 16 },
  label:     { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  input:     { borderWidth: 1.5, borderRadius: 8, padding: 13, fontSize: 16, minHeight: 48 },
  errorBox:  { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", marginBottom: 12 },
  errorText: { fontSize: 13, flex: 1 },
  btn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 10, marginTop: 8 },
  btnText:   { fontSize: 16, fontWeight: "600" },
  footer:    { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText:{ fontSize: 14 },
  footerLink:{ fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});

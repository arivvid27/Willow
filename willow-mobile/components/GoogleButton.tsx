// components/GoogleButton.tsx — Google OAuth for React Native
// Uses expo-auth-session + expo-web-browser (Supabase recommended approach)

import { useState, useEffect } from "react";
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";

// Required: tells expo-web-browser to complete the auth session on redirect
WebBrowser.maybeCompleteAuthSession();

interface GoogleButtonProps {
  label?: string;
  onSuccess?: () => void;
}

export default function GoogleButton({ label = "Continue with Google", onSuccess }: GoogleButtonProps) {
  const { tokens } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,   // we handle the browser ourselves
          redirectTo:          "willow://auth/callback",
        },
      });

      if (oauthError || !data?.url) {
        setError(oauthError?.message ?? "Could not start Google sign-in.");
        setLoading(false);
        return;
      }

      // Open the OAuth URL in the system browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        "willow://auth/callback"
      );

      if (result.type === "success") {
        // Extract tokens from the URL fragment
        const url = result.url;
        const params = new URLSearchParams(url.split("#")[1] ?? url.split("?")[1] ?? "");
        const accessToken  = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionErr } =
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

          if (sessionErr || !sessionData.session) {
            setError("Failed to complete sign-in. Please try again.");
            setLoading(false);
            return;
          }

          const userId = sessionData.session.user.id;

          // Check if new user needs profile setup
          const { data: existing } = await supabase
            .from("caregiver_access")
            .select("profile_id")
            .eq("user_id", userId)
            .limit(1)
            .single();

          if (existing) {
            // Returning user
            onSuccess ? onSuccess() : router.replace("/(tabs)");
          } else {
            // New Google user — send to profile setup
            router.replace("/(auth)/setup");
          }
        } else {
          setError("Sign-in incomplete. Please try again.");
        }
      } else if (result.type === "cancel") {
        // User closed the browser — not an error
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const s = styles(tokens);

  return (
    <View>
      <TouchableOpacity
        style={[s.btn, { opacity: loading ? 0.6 : 1 }]}
        onPress={handleGoogleLogin}
        disabled={loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tokens.textMuted} />
        ) : (
          /* Google G mark — drawn with simple coloured boxes since SVG isn't
             natively available; using text emoji as a clean fallback */
          <Text style={{ fontSize: 18, lineHeight: 22 }}>G</Text>
        )}
        <Text style={[s.btnText, { color: tokens.text }]}>
          {loading ? "Opening Google…" : label}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={[s.error, { color: tokens.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = (t: any) => StyleSheet.create({
  btn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    height:          50,
    borderRadius:    10,
    borderWidth:     1.5,
    borderColor:     t.border,
    backgroundColor: t.surface,
  },
  btnText: {
    fontSize:   15,
    fontWeight: "500",
  },
  error: {
    fontSize:   12,
    marginTop:  6,
    textAlign:  "center",
  },
});

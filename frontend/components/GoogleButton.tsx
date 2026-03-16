"use client";
// components/GoogleButton.tsx — Google OAuth button for web

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface GoogleButtonProps {
  label?: string;
  redirectTo?: string;
}

export default function GoogleButton({
  label = "Continue with Google",
  redirectTo,
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          redirectTo ??
          `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt:      "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success Supabase redirects the browser — no need to do anything else
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        aria-busy={loading}
        aria-label="Sign in with Google"
        className="w-full flex items-center justify-center gap-3 rounded-lg px-4 transition-all active:scale-[0.98]"
        style={{
          height:      "44px",
          background:  "var(--color-surface)",
          border:      "1.5px solid var(--color-border)",
          color:       "var(--color-text)",
          fontWeight:  500,
          fontSize:    "0.9375rem",
          cursor:      loading ? "not-allowed" : "pointer",
          opacity:     loading ? 0.6 : 1,
        }}
      >
        {/* Google G logo SVG */}
        {!loading ? (
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            style={{ animation: "spin 0.75s linear infinite" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        )}
        {loading ? "Redirecting…" : label}
      </button>

      {error && (
        <p role="alert" className="text-xs mt-2 text-center"
          style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
